# when adding a new script
1. add python dependencies to requirements.txt and apt dependencies to apt-requirements.txt
2. add script config to supervisord.conf to be started automatically by docker

# Troubleshooting guide
1. When deploying a new computer or swapped videos on the device, the /dev/video# may be different. Right now I'm manually changing this number in util.py - for example, /dev/video14 was the one I had on my dev desktop and I had to change it to /dev/video10 for NUC
```
PIPELINE_DESC = '''
webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 turn-server=turn://your.turn.server:3478?transport=udp latency=100 
v4l2src device=/dev/video14 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! sendrecv. \
rosimagesrc ros-topic="/camera/camera/color/image_raw" ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
'''
```
