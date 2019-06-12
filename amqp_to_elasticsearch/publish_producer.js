// Connection for MQTT
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt:192.168.99.100');
client.on('connect', function () {
	client.subscribe('test/data', { qos: 1 });
	console.log('MQTT topic subscribed')
});

// Connection for Elasticsearch
var elasticsearch = require('elasticsearch');
var indexName = 'device001'; // Soon document type will be removed from elasticsearch. So, gave device name as index name.
var typeName = 'logs';
var elasticClient = new elasticsearch.Client({
	host: '192.168.99.100:9200',
	log: 'trace'
});
// Check the index and if it does not exist then create one.
elasticClient.indices.exists({
	index: indexName
}, function (err, res, status) {
	if (res) {
		console.log('Index is already exists.');
	} else {
		elasticClient.indices.create({
			index: indexName
		}, function (err, resp, status) {
			console.log(err, resp, status)
		});
		console.log('Index does not exists and created.')
	}
});
// Creating index mappling in Elasticsearch
elasticClient.indices.putMapping({
	index: indexName,
	type: typeName,
	include_type_name: true,
	body: {
		properties: {
			deviceName: { type: 'keyword' },
			platform: { type: 'keyword' },
			version: { type: 'text' },
			processes: {
				properties: {
					running: { type: "integer" },
					blocked: { type: "integer" }
				}
			},
			memoryUsage: {
				properties: {
					totalSpace: { type: "long" },
					freeSpace: { type: "long" },
					memoryUsed: { type: "float" }
				}
			},
			time: { type: "date" }
		}
	}
}, function (err, resp, status) {
	if (err) {
		console.log(err);
	} else {
		console.log(resp)
	}
});

// Connection for AMQP
var amqp = require('amqplib/callback_api');
amqp.connect('amqp://192.168.99.100', function (error0, connection) {
	if (error0) {
		throw error0;
	}
	connection.createChannel(function (error1, channel) {
		if (error1) {
			throw error1;
		}
		var exchange = 'hello';
		channel.assertExchange(exchange, 'fanout', {
			durable: false
		});
		// Get MQTT data, forward data to AMQP and store data to Elasticsearch
		client.on('message', function (topic, message) {
			var mqtt_data = JSON.parse(message);
			channel.publish(exchange, '', Buffer.from(message));
			console.log("[x] Sent through AMQP: %s", message);
			elasticClient.index({
				index: indexName,
				type: typeName,
				id: message.id,
				body: mqtt_data
			}, function (err, resp, status) {
				if (err) {
					console.log(err);
				} else {
					console.log(resp)
				}
			});
		});
	});
});


