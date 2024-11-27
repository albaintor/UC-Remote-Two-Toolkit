import os from "os";
import net from "net";
import dgram from "dgram";
let createWOLPacket = (mac) => {
    mac = mac.replace(/:/g, '');
    if (mac.length !== 12 || mac.match(/[^a-fA-F0-9]/))
        throw new Error(`Invalid MAC address: ${mac}`);
    return new Buffer('ff'.repeat(6) + mac.repeat(16), 'hex');
};
let getBroadcastAddr = (ip, netmask) => {
    let a = ip.split('.').map(s => parseInt(s, 10));
    let b = netmask.split('.').map(s => parseInt(s, 10));
    let c = [];
    for (let i = 0; i < a.length; i++)
        c.push((a[i] & b[i]) | (b[i] ^ 255));
    return c.join('.');
};
let sendToAll = (mac, opts) => {
    let promises = [];
    let ifaces = os.networkInterfaces();
    for (let p in ifaces) {
        ifaces[p].forEach((iface) => {
            if (iface.internal || !net.isIPv4(iface.address))
                return;
            let ifaceOpts = Object.assign({}, opts);
            ifaceOpts.from = iface.address;
            ifaceOpts.address = getBroadcastAddr(iface.address, iface.netmask);
            promises.push(send(mac, ifaceOpts));
        });
    }
    return Promise.all(promises);
};
export function send(mac, opts = {}) {
    if (!opts.from)
        return sendToAll(mac, opts);
    return new Promise((resolve, reject) => {
        try {
            let from = opts.from;
            let port = opts.port || 9;
            let count = opts.count || 3;
            let address = opts.address || '255.255.255.255';
            let interval = opts.interval || 100;
            let intervalId;
            let pkt = createWOLPacket(mac);
            let done = (err) => {
                count--;
                if (!count || err) {
                    socket.close();
                    clearInterval(intervalId);
                    if (err)
                        return reject(err);
                    return resolve(true);
                }
            };
            let doSend = () => {
                socket.send(pkt, 0, pkt.length, port, address, done);
            };
            let socket = dgram.createSocket(net.isIPv6(address) ? 'udp6' : 'udp4');
            socket.unref();
            socket.bind(0, from, () => {
                socket.setBroadcast(true);
                socket.once('error', done);
                doSend();
                intervalId = setInterval(doSend, interval);
            });
        }
        catch (err) {
            return reject(err);
        }
    });
}
