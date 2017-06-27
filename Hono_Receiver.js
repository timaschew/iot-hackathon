/*
 * Bosch SI Example Code License Version 1.0, January 2016
 *
 * Copyright 2016 Bosch Software Innovations GmbH ("Bosch SI"). All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 * disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 * following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * BOSCH SI PROVIDES THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE
 * QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL
 * NECESSARY SERVICING, REPAIR OR CORRECTION. THIS SHALL NOT APPLY TO MATERIAL DEFECTS AND DEFECTS OF TITLE WHICH BOSCH
 * SI HAS FRAUDULENTLY CONCEALED. APART FROM THE CASES STIPULATED ABOVE, BOSCH SI SHALL BE LIABLE WITHOUT LIMITATION FOR
 * INTENT OR GROSS NEGLIGENCE, FOR INJURIES TO LIFE, BODY OR HEALTH AND ACCORDING TO THE PROVISIONS OF THE GERMAN
 * PRODUCT LIABILITY ACT (PRODUKTHAFTUNGSGESETZ). THE SCOPE OF A GUARANTEE GRANTED BY BOSCH SI SHALL REMAIN UNAFFECTED
 * BY LIMITATIONS OF LIABILITY. IN ALL OTHER CASES, LIABILITY OF BOSCH SI IS EXCLUDED. THESE LIMITATIONS OF LIABILITY
 * ALSO APPLY IN REGARD TO THE FAULT OF VICARIOUS AGENTS OF BOSCH SI AND THE PERSONAL LIABILITY OF BOSCH SI'S EMPLOYEES,
 * REPRESENTATIVES AND ORGANS.
 */

'use strict';

/* Parse command-line arguments */

var argv = require('minimist')(process.argv.slice(2));

if (argv['h'] || argv['help']) {
    console.log("Usage: node Hono_Receiver.js --host myhostname --port 15672 --user me --pass secret [ --filter regex]");
    process.exit(0);
}

var optHost = argv['host'] || 'localhost';
var optPort = argv['port'] || 15672;
var optUsername = String(argv['user'] || '');
var optPassword = String(argv['pass'] || '');
var optFilter = new RegExp(String(argv['filter'] || '.*'));

/* Set up AMQP connection objects */

var container = require('rhea');

var connectionOptions = {
    host: optHost,
    port: optPort,
    container_id: container.generate_uuid(),
    username: optUsername,
    password: optPassword
};

var telemetryReceiverOptions = {
    source: {
        address: 'telemetry/bcx',
        dynamic: 0, // none
        expiry_policy: "session-end"
    },
    credit_window: 100,
    autoaccept: true,
    snd_settle_mode: 1, // settled
    rcv_settle_mode: 0 // first
};

var eventReceiverOptions = {
    source: {
        address: 'event/bcx',
        dynamic: 0, // none
        expiry_policy: "session-end"
    },
    credit_window: 100,
    autoaccept: true,
    snd_settle_mode: 0, // unsettled
    rcv_settle_mode: 1 // second
};

function decodeContent(content) {
    var str = null;
    if (content instanceof Buffer) {
        str = content.toString();
    } else if (typeof content === 'string') {
        str = content;
    } else {
        return content; // No clue.
    }

    try {
        return JSON.parse(str);
    } catch (e) {
        return str;
    }
}

const io = require('socket.io')();
const clients = []
let clientCounter = 1
io.on('connection', function(client){
    clients.push(clients)
    const clientId = clientCounter++
    console.log('client connected', clientId)
    console.log('clients', clients)
    client.on('disconnect', function(){
        console.log('client disconnected', clientId)
        const index = clients.indexOf(client)
        clients.splice(index, 1)
    });
});
io.listen(process.env.PORT || 3000);

function broadcast(sensor, payload) {
    console.log('broadcasting', sensor)
    io.emit(sensor, payload)
    // for (let i = 0; i < clients.length; i++) {
    //     const client = clients[i]
    //     console.log('client', client, Object.keys(client))
    //     console.log('emitting', sensor, payload)
    //     client.emit(sensor, payload)
    // }
}

/* Establish AMQP connection */


let lastConnection = null
const init = function() {
    console.log("Connecting to amqp://" + connectionOptions.username + ":" + (connectionOptions.password ? '***' : '')
        + "@" + connectionOptions.host + ":" + connectionOptions.port);

    const connection = container.connect(connectionOptions);
    lastConnection = connection
    /* Callbacks for connection events */

    connection.on('connection_open', function (context) {
        console.log("AMQP connection established")
        context.connection.open_receiver(telemetryReceiverOptions);
        context.connection.open_receiver(eventReceiverOptions);
    });

    connection.on('disconnected', function(context) {
        console.log("AMQP connection disconnected!")
        process.exit(1);
    });

    connection.on('connection_error', function(context) {
        const error = context.connection.get_error();
        console.error(error);
    });

    //
    connection.on('message', function (context) {
        const tenant_id = context.message.message_annotations.tenant_id;
        const device_id = context.message.message_annotations.device_id;
        const resource = context.message.message_annotations.resource;
        const data = decodeContent(context.message.body.content);
        if (device_id !== 'xdk.7cec79d330df') {
            return
        }
        switch(true) {
            case /^telemetry\//.test(resource):
                if (!optFilter.test(device_id)) {
                    break;
                }
                console.log('data.path', data.path)
                if (['/features/magnetometer_0', '/features/accelerometer_0', '/features/gyrometer_0'].indexOf(data.path) !== -1) {
                    const payload = data.value.properties.status
                    const {x_value, y_value, z_value} = payload
                    broadcast(data.path, [x_value, y_value, z_value])
                }
                // Perform your telemetry handling here
                //console.log("TELEMETRY [%s/%s] (%s) %s", tenant_id, device_id, data, JSON.stringify(data, null, 2));
                break;
            case /^event\//.test(resource):
                if (!optFilter.test(device_id)) {
                    break;
                }
                // Perform your event handling here
                console.log("EVENT     [%s/%s] (%s) %s", tenant_id, device_id, data, JSON.stringify(data, null, 2));
                break;
            default:
                console.log("UNKNOWN:%s [%s/%s] (%s) %s", resource, tenant_id, device_id, data, JSON.stringify(data, null, 2));
        }
    //    console.log(JSON.stringify(context.message, null, 2))

    });

}

init()

process.on('uncaughtException', function(err) {
  console.log('uncaught exception: ', err);
  lastConnection.disconnect && lastConnection.disconnect()
  lastConnection.close && lastConnection.close()
  connectionOptions.container_id = container.generate_uuid()
  init()
});

function exitHandler() {
    if (connection && connection.is_open()) {
        console.log("\nClosing AMQP connection\n")
        connection.close();
    }
    process.exit(1);
}
