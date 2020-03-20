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
Just git for now
```
sudo apt install git
```

### Prepare system
MPD's configuration isn't configured for internal mounts by default. The following script changes to a simple database and creates the structures required.
```
sudo sed 's/db_file/#db_file/g' -i /etc/mpd.conf
printf "database {\n plugin \"simple\"\n path \"/var/lib/mpd/db\"\n cache_directory \"/var/lib/mpd/cache\"\n}" | sudo tee -a /etc/mpd.conf
sudo mkdir -p /var/lib/mpd/cache
sudo touch /var/lib/mpd/db
sudo chown mpd.audio /var/lib/mpd/cache
sudo chown mpd.audio /var/lib/mpd/db
sudo systemctl restart mpd
```

### Install Moosic
```
git clone https://github.com/gilphilbert/mpdui.git
cd moosic
sudo mv moosic.service /etc/systemd/system
npm install
sudo systemctl enable moosic
sudo systemctl start moosic
```

You might want to configure this as a deamon (I'll probably get around to it at some point...)
