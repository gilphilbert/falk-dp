## Moosic
A web-sockets based UI for MPD based on pure Javascript, with NodeJS as the MPD client and websocket server.

#### Note: Not much to see here
This is under heavy construction, it kinda works, but many features are missing at the moment.

## Installing
Moosic is designed to be installed on Debian, primarily Raspbian on a Raspberry Pi with a DAC installed.

### Install NodeJS
```
sudo apt-get install curl software-properties-common
curl -sL https://deb.nodesource.com/setup_13.x | sudo bash -
```

### Install Prereqs
```
sudo apt install git
```

### Prepare system
```
sed 's/db_file/#db_file/g' /etc/mpd.conf
printf "database {\n plugin "simple"\n path "/var/lib/mpd/db"\n cache_directory "/var/lib/mpd/cache"\n}" | sudo tee -a mpd.conf
sudo mkdir -p /var/lib/mpd/cache
sudo touch /var/lib/mpd/db
sudo chown mpd.audio /var/lib/mpd/cache * -R
```

### Install Moosic
```
git clone https://github.com/gilphilbert/mpdui.git
cd moosic
npm install
npm start
```

You might want to configure this as a deamon (I'll probably get around to it at some point...)
