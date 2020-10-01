## Moosic
Moosic turns a system into a bit-perfect MPD client designed for high-res lossless local files (although it will play lossy audio too). A web-sockets based UI for MPD based on pure Javascript, with NodeJS as the MPD client and websocket server. The following scripts will configure an out-of-the box Raspberry Pi with Raspbian. The finished system can still be managed with any MPD client although Moosic includes an HTML5 webclient that's built for performance, across mobile and desktop devices.

#### Note: Not much to see here
This is under heavy construction, it kinda works, but many features are missing at the moment.

## Installation
Moosic is designed to be installed on Debian, primarily Raspbian on a Raspberry Pi with a DAC installed.

### Install NodeJS
Get the latest from NodeJS
```
sudo apt-get install curl software-properties-common
curl -sL https://deb.nodesource.com/setup_13.x | sudo bash -
sudo apt-get install nodejs
```

### Install Prereqs
We'll need git, but also some prereqs for the bluetooth/USB remote support
```
sudo apt install git
sudo apt install libusb-1.0-0 libusb-1.0-0-dev libudev-dev 
```

### Install Moosic
```
git clone https://github.com/gilphilbert/falk-dp.git
sudo mv falk-dp /opt/
cd /opt/falk-dp
npm install

//configure MPD
sudo mv /etc/mpd.conf /etc/mpd.conf.bak
sudo mv mpd.conf /etc/mpd.conf
sudo mkdir -p /var/lib/mpd/cache
sudo touch /var/lib/mpd/db
sudo chown mpd.audio /var/lib/mpd/cache
sudo chown mpd.audio /var/lib/mpd/db
sudo systemctl restart mpd

//configure udev
sudo mv 99-falk.rules /etc/udev/rules.d/
sudo systemctl restart udev

//install falk as a service
sudo mv falk.service /etc/systemd/system
sudo systemctl enable falk
sudo systemctl start falk
```

### Configure a bluetooth remote
```
bluetoothctl
 -> discovery on
 -> ...
```
You may need to add appropriate UDEV rules (instructions needed!)
