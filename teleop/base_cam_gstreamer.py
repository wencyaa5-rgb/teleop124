import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
import gi
from gi.repository import Gst



# Gst.debug_set_default_threshold(Gst.DebugLevel.DEBUG)

class RosGstPublisher(Node):
    def __init__(self):
        super().__init__('ros_gst_publisher')
        self.bridge = CvBridge()
        self.subscription = self.create_subscription(
            Image, '/camera/color/image_raw', self.image_callback, 10)
        self.subscription  # prevent unused variable warning

        # GStreamer setup
        Gst.init(None)
        self.pipeline = Gst.parse_launch(
            "appsrc name=source1 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302")
        self.appsrc1 = self.pipeline.get_by_name("source1")
        self.pipeline.set_state(Gst.State.PLAYING)

    def image_callback(self, msg):
        # Convert ROS Image message to OpenCV image
        frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")

        # Convert the OpenCV image to GStreamer buffer
        data = frame.tobytes()
        buffer = Gst.Buffer.new_allocate(None, len(data), None)
        buffer.fill(0, data)
        buffer.pts = buffer.dts = Gst.util_uint64_scale(self.get_clock().now().nanoseconds, 1, 1_000_000_000)
        buffer.duration = Gst.util_uint64_scale(1, Gst.SECOND, 30)

        # Push the buffer into the GStreamer pipeline
        self.appsrc1.emit('push-buffer', buffer)

    def stop(self):
        self.pipeline.set_state(Gst.State.NULL)

def main(args=None):
    rclpy.init(args=args)
    node = RosGstPublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.stop()
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
