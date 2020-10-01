var HID = require('node-hid')
var udev = require("udev")

var device;

async function setup () {
    checkDevices()
    startMonitor()
}

function checkDevices() {
    //satechi remote
    vendorId = 1444;
    productId = 4096;

    devices = HID.devices();

    var deviceInfo = devices.find( function(d) {
        return d.vendorId===vendorId && d.productId===productId;
    });

    if (deviceInfo) {
        openDevice(deviceInfo)
    }
}

function startMonitor() {
    var monitor = udev.monitor("hidraw")
    monitor.on('add', function (device) {
        checkDevices()
    })
}

async function openDevice(deviceInfo) {
    var mpdapi = require('mpd-api')
    var mpdc = null
    async function connectMPD () {
        console.log('Connecting to MPD...')
        try {
            mpdc = await mpdapi.connect({ path: '/run/mpd/socket' })
            console.log('Connected to MPD (remote)')

            mpdc.on('close', () => {
            console.log('MPD connection lost')
            connectMPD()
            })
        } catch (e) {
            console.log('Couldn\'t connect to MPD')
            console.log(e)
        }
    }
    await connectMPD()

    device = new HID.HID(deviceInfo.path);
    device.on("data", function(data) {
        val = data.readUInt32LE();
        if (val === 1 || val === 2) { return }
        cmd = "";
        switch(val) {
            case 131074:
                cmd = "volUp";
                break;
            case 262146:
                cmd = "volDown";
                break;
            case 524290:
                cmd = "mute";
                break;
            case 32770:
                // prev
                mpdc.api.playback.prev()
                break;
            case 65538:
                // next
                mpdc.api.playback.next()
                break;
            case 8194:
                // pausePlay
                mpdc.api.playback.toggle()
                break;
            case 258:
                cmd = "home";
                break;
        }
        if (cmd != "") {
            console.log(cmd);
        } else {
            console.log(val);
        }
    });

    device.on("error", function(err) {
        console.log(err)
        device.disconnect()
        mpdapi.disconnect()
        device = null
    });
}

module.exports = {
    setup: setup
}
  