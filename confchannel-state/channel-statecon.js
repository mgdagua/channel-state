//*jshint node: true*/

'use strict';

var ari = require('ari-client');
var util = require('util');
var timers = {};

var conferenceRoom = 'myconference'; // Nombre de la sala de conferencia

ari.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

// handler for client being loaded
function clientLoaded(err, client) {
    if (err) {
        throw err;
    }

    // handler for StasisStart event
    function stasisStart(event, channel) {
        console.log(util.format('Channel %s has entered the application', channel.name));

        // Agregar canal a la sala de conferencia
        channel.startConference(conferenceRoom)
            .then(() => {
                console.log(util.format('Channel %s has joined the conference room', channel.name));
            })
            .catch((err) => {
                console.error('Error joining conference:', err);
            });

        // Reproducir un anuncio de bienvenida
        channel.play({ media: 'sound:welcome-message' }, function(err) {
            if (err) {
                throw err;
            }
        });

        // Manejar entrada de dígitos del usuario
        channel.on('ChannelDtmfReceived', handleDtmfInput);
    }

    // handler for StasisEnd event
    function stasisEnd(event, channel) {
        console.log(util.format('Channel %s just left our application', channel.name));
        var timer = timers[channel.id];
        if (timer) {
            clearTimeout(timer);
            delete timers[channel.id];
        }
    }

    // handler for ChannelStateChange event
    function channelStateChange(event, channel) {
        console.log(util.format('Channel %s is now: %s', channel.name, channel.state));
    }

    // Manejar entrada de dígitos del usuario
    function handleDtmfInput(event, channel) {
        var digit = event.digit;
        console.log(util.format('Channel %s pressed %s', channel.name, digit));

        switch (digit) {
            case '1':
                // Silenciar/Activar audio del canal
                channel.mute(!channel.muted, function(err) {
                    if (err) {
                        throw err;
                    }
                    console.log(util.format('Channel %s audio is now %s', channel.name, channel.muted ? 'muted' : 'unmuted'));
                });
                break;
            case '2':
                // Abandonar la sala de conferencia
                channel.stopConference()
                    .then(() => {
                        console.log(util.format('Channel %s has left the conference room', channel.name));
                        channel.hangup();
                    })
                    .catch((err) => {
                        console.error('Error leaving conference:', err);
                    });
                break;
            // Agrega más opciones según tus necesidades
        }
    }

    client.on('StasisStart', stasisStart);
    client.on('StasisEnd', stasisEnd);
    client.on('ChannelStateChange', channelStateChange);

    client.start('channel-state');
}
