// Connection for MQTT
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt:192.168.99.109');
client.on('connect', function () {
	// Here also we have to mention mqtt channel
	const deviceId = "ddeb27fb-d9a0-4624-be4d-4615062daed4"
	client.subscribe(deviceId + "/canData", { qos: 1 });
	console.log('MQTT topic subscribed')
});

// Connection for AMQP
var amqp = require('amqplib/callback_api');
amqp.connect('amqp://192.168.99.109', function (error0, connection) {
	if (error0) {
		throw error0;
	}
	connection.createChannel(function (error1, channel) {
		if (error1) {
			throw error1;
		}
		var exchange = 'dummyExchange';
		channel.assertExchange(exchange, 'fanout', {
			durable: false
		});
		console.log(" [*] Waiting for messages. To exit press CTRL+C");
		// Get MQTT data, forward data to AMQP
		client.on('message', function (topic, message) {
			channel.publish(exchange, '', Buffer.from(message));
			console.log("\n[x] Sent through AMQP: %s", message);
		});
	});
});


