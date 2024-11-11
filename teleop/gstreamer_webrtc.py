import sys
import ssl
import websockets
import asyncio
import json
import argparse
import logging
from util import get_mac_address, generate_robot_id, PIPELINE_DESC

import gi
from gi.repository import Gst
from gi.repository import GstWebRTC
from gi.repository import GstSdp
from gi.repository import GLib

# Uncomment this when debugging
# Gst.debug_set_default_threshold(Gst.DebugLevel.DEBUG)

SIGNALING_SERVER_URL = 'wss://application.intuitivemotion.ai:8443'

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebRTCClient:
    def __init__(self, id_, server, loop):
        self.id_ = id_
        self.conn = None
        self.pipe = None
        self.webrtc = None
        self.server = server
        self.loop = loop
        self.ice_candidate_queue = []
        self.robot_id = generate_robot_id(get_mac_address())  # Get robot_id using MAC address
        self.bearer_token = 'fb4a1a4c486cec5708f906e90b7c040d'  # Replace with your actual token

    async def connect(self):
        ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        try:
            self.conn = await websockets.connect(self.server, ssl=ssl_context)
            logging.info("Connected to signaling server")
            # Send the join-room message with the robot_id
            await self.conn.send(json.dumps({
                'type': 'join-room',
                'roomId': self.robot_id,
                'role': 'workstation'
            }))
            logging.info(f"Sent join-room message with roomId: {self.robot_id}")
        except Exception as e:
            logging.error(f"Failed to connect to signaling server: {e}")
            return False
        return True

    def send_sdp_offer(self, offer):
        text = offer.sdp.as_text()
        logging.info('Sending offer:\n%s' % text)
        msg = json.dumps({'type': 'offer', 'sdp': text})
        asyncio.run_coroutine_threadsafe(self.conn.send(msg), self.loop)

    def on_offer_created(self, promise, _, __):
        promise.wait()
        reply = promise.get_reply()
        offer = reply.get_value('offer')
        promise = Gst.Promise.new()
        self.webrtc.emit('set-local-description', offer, promise)
        promise.interrupt()
        self.send_sdp_offer(offer)

    def on_negotiation_needed(self, element):
        logging.info("Negotiation needed")
        promise = Gst.Promise.new_with_change_func(self.on_offer_created, element, None)
        element.emit('create-offer', None, promise)

    def send_ice_candidate_message(self, _, mlineindex, candidate):
        icemsg = json.dumps({'type': 'ice-candidate', 'candidate': {'candidate': candidate, 'sdpMLineIndex': mlineindex}})
        asyncio.run_coroutine_threadsafe(self.conn.send(icemsg), self.loop)

    def on_incoming_decodebin_stream(self, _, pad):
        if not pad.has_current_caps():
            logging.info('%s has no caps, ignoring' % pad)
            return

        caps = pad.get_current_caps()
        assert (len(caps))
        s = caps[0]
        name = s.get_name()
        if name.startswith('video'):
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('videoconvert')
            sink = Gst.ElementFactory.make('autovideosink')
            self.pipe.add(q, conv, sink)
            self.pipe.sync_children_states()
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(sink)
        elif name.startswith('audio'):
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('audioconvert')
            resample = Gst.ElementFactory.make('audioresample')
            sink = Gst.ElementFactory.make('autoaudiosink')
            self.pipe.add(q, conv, resample, sink)
            self.pipe.sync_children_states()
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(resample)
            resample.link(sink)

    def on_incoming_stream(self, _, pad):
        if pad.direction != Gst.PadDirection.SRC:
            return

        decodebin = Gst.ElementFactory.make('decodebin')
        decodebin.connect('pad-added', self.on_incoming_decodebin_stream)
        self.pipe.add(decodebin)
        decodebin.sync_state_with_parent()
        self.webrtc.link(decodebin)

    def on_ice_connection_state_change(self, webrtcbin, state):
        state_str = {
            GstWebRTC.WebRTCICEConnectionState.NEW: "new",
            GstWebRTC.WebRTCICEConnectionState.CHECKING: "checking",
            GstWebRTC.WebRTCICEConnectionState.CONNECTED: "connected",
            GstWebRTC.WebRTCICEConnectionState.COMPLETED: "completed",
            GstWebRTC.WebRTCICEConnectionState.FAILED: "failed",
            GstWebRTC.WebRTCICEConnectionState.DISCONNECTED: "disconnected",
            GstWebRTC.WebRTCICEConnectionState.CLOSED: "closed",
        }.get(self.webrtc.get_property(state.name), "unknown")
        logging.info(f"ICE connection state changed: {state_str}")
        # adds auto reconnect functionality
        if state in [GstWebRTC.WebRTCICEConnectionState.FAILED, GstWebRTC.WebRTCICEConnectionState.DISCONNECTED, GstWebRTC.WebRTCICEConnectionState.CLOSED]:
            logging.info("ICE connection failed/disconnected/closed. Attempting to reconnect.")
            asyncio.run_coroutine_threadsafe(self.reconnect(), self.loop)

    def start_pipeline(self):
        def on_gst_message(bus: Gst.Bus, message: Gst.Message, loop: GLib.MainLoop):
            mtype = message.type
            if mtype == Gst.MessageType.EOS:
                logging.info("End of stream")
                loop.quit()
            elif mtype == Gst.MessageType.ERROR:
                err, debug = message.parse_error()
                logging.error(err, debug)
                loop.quit()
            elif mtype == Gst.MessageType.WARNING:
                err, debug = message.parse_warning()
                logging.debug(err, debug)
            return True
        
        logging.info("Starting pipeline")
        try:
            self.pipe = Gst.parse_launch(PIPELINE_DESC)
            bus = self.pipe.get_bus()
            bus.add_signal_watch()
            self.webrtc = self.pipe.get_by_name('sendrecv')
            self.webrtc.connect('on-negotiation-needed', self.on_negotiation_needed)
            self.webrtc.connect('on-ice-candidate', self.send_ice_candidate_message)
            self.webrtc.connect('pad-added', self.on_incoming_stream)
            self.webrtc.connect('notify::ice-connection-state', self.on_ice_connection_state_change)
            self.pipe.set_state(Gst.State.PLAYING)
            bus.connect("message", on_gst_message, self.loop)
            logging.info("Pipeline started successfully")
        except Exception as e:
            logging.error(f"Error starting pipeline: {e}")

    def handle_sdp(self, message):
        if not self.webrtc:
            logging.error("Error: WebRTC bin not initialized.")
            return
        msg = json.loads(message)
        if 'sdp' in msg:
            sdp = msg['sdp']
            logging.info("Adding Remote SDP:\n%s" % sdp)
            if msg['type'] == 'answer':
                logging.info('Received answer:\n%s' % sdp)
                res, sdpmsg = GstSdp.SDPMessage.new()
                GstSdp.sdp_message_parse_buffer(bytes(sdp.encode()), sdpmsg)
                answer = GstWebRTC.WebRTCSessionDescription.new(GstWebRTC.WebRTCSDPType.ANSWER, sdpmsg)
                promise = Gst.Promise.new()
                self.webrtc.emit('set-remote-description', answer, promise)
                promise.wait()
                self.remote_description_set = True
                self.process_queued_ice_candidates()
        elif 'candidate' in msg:
            ice = msg['candidate']
            candidate_str = ice['candidate']
            sdpmlineindex = ice['sdpMLineIndex']
            if self.remote_description_set:
                logging.info("Adding ice Candidate:\n%s" % ice)
                self.webrtc.emit('add-ice-candidate', sdpmlineindex, candidate_str)
            else:
                self.ice_candidate_queue.append(ice)

    def process_queued_ice_candidates(self):
        for ice in self.ice_candidate_queue:
            candidate = ice['candidate']
            sdpmlineindex = ice['sdpMLineIndex']
            logging.info("Processing queued candidate:\n%s" % candidate)
            self.webrtc.emit('add-ice-candidate', sdpmlineindex, candidate)
        self.ice_candidate_queue = []

    def close_pipeline(self):
        if self.pipe:
            logging.info("Closing pipeline")
            self.pipe.set_state(Gst.State.NULL)
            self.pipe = None
            self.webrtc = None
        else:
            logging.info("Pipeline is already closed or was never started")

    async def reconnect(self):
        """Attempt to reconnect the WebRTC pipeline."""
        self.close_pipeline()  # Close the existing pipeline
        while True:
            logging.info("Attempting to reconnect...")
            connected = await self.connect()
            if connected:
                logging.info("Reconnection successful")
                await self.main_loop()
                break
            logging.info("Reconnection failed, retrying in 5 seconds...")
            await asyncio.sleep(5)

    async def main_loop(self):
        assert self.conn
        self.start_pipeline()
        async for message in self.conn:
            logging.debug('Received message:\n%s' % message)
            self.handle_sdp(message)
        self.close_pipeline()
        return 0

def check_plugins():
    needed = ["opus", "vpx", "nice", "webrtc", "dtls", "srtp", "rtp",
              "rtpmanager", "videotestsrc", "audiotestsrc"]
    missing = list(filter(lambda p: Gst.Registry.get().find_plugin(p) is None, needed))
    if len(missing):
        logging.warn('Missing gstreamer plugins: %s' % missing)
        return False
    return True

if __name__=='__main__':
    Gst.init(None)
    if not check_plugins():
        sys.exit(1)
    parser = argparse.ArgumentParser()
    parser.add_argument('--server', help='Signalling server to connect to', default=SIGNALING_SERVER_URL)
    args = parser.parse_args()
    loop = asyncio.get_event_loop()
    c = WebRTCClient(200, args.server, loop)
    loop.run_until_complete(c.reconnect())
    sys.exit(0)
