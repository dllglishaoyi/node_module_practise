var xml2js = require('xml2js');
var md5 = require('MD5');
var request = require('request');
var fs = require('fs');

exports.Redpack = Redpack;

var HOST_URL = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack';

function getIP() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ip = undefined;
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0;
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }
        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          console.log(ifname + ':' + alias, iface.address);
          ip = iface.address;
        } else {
          // this interface has only one ipv4 adress
          console.log(ifname, iface.address);
          ip = iface.address;
        }

      });
    });
    return ip;
}

function getNonceStr(length) {
    if (!length) {
        length = 32;
    };
    var $chars = 'ABCDlmnopqrstEFGHIJKLYZabcdeMUVWXfghijkuvwxyz012345NOPQRST6789';
    var maxPos = $chars.length;
    var noceStr = "";
    for (i = 0; i < length; i++) {
        noceStr += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return noceStr;
}

var sign = function(obj){
    var PARTNER_KEY = obj.partner_key || "";
    ['key', 'pfx', 'partner_key', 'sign'].forEach(function(k){
        delete obj[k];
    });
    var querystring = Object.keys(obj).filter(function(key){
        return obj[key] !== undefined && obj[key] !== '';
    }).sort().map(function(key){
        return key + '=' + obj[key];
    }).join('&') + "&key=" + PARTNER_KEY;
    console.log("querystring",querystring);
    obj.sign = md5(querystring).toUpperCase();

    return obj;
};

var config_example = {
    mch_billno : '10000098201411111234567890',
    send_name  : 'send_name',
    re_openid  : 'xxx',
    total_amount :1,
    pfx:"libs/redpack/apiclient_cert.p12",
    wishing:'红包祝福语',
    act_name:'活动名称',
    remark:'备注信息'
};
function Redpack(config) {
    var default_config = {
        nonce_str: getNonceStr(),
        client_ip :getIP(),
    };
    var final_config = default_config;

    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            if (config[key] !== undefined) {
                final_config[key] = config[key];
            }
        }
    }
    this._config = final_config || {};
    var that = this;
    this.send = function(callback){
        var PFX = that._config.pfx;
        var opts = sign(that._config);
        var builder = new xml2js.Builder();
        var xml = builder.buildObject({ xml:opts });
        console.log(xml);
        request({
            url: HOST_URL, 
            method: 'POST',
            body: xml,
            agentOptions: {
                pfx: fs.readFileSync(PFX),
                passphrase: opts.mch_id
            }
        }, 
            function(err, response, body){
                if (callback) {
                    if(body){
                        var parseString = require('xml2js').parseString;
                        parseString(body, function (error, result) {
                            callback(err,body);
                        });
                    }else{
                        callback(err,body);
                    }
                    
                };
        });
    };
};
