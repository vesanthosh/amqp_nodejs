
var MongoClient = require('mongodb').MongoClient;
var mongoURI = 'mongodb://user:password@192.168.99.100:27017/mqtt_db';

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt:192.168.99.100');

var collection;

var amqp = require('amqplib/callback_api');
var amqp_channel;
var exchange;

client.on('connect', function () {
    client.subscribe('test/data', { qos: 1 });
    console.log('MQTT topic subscribed')
});

amqp.connect('amqp://192.168.99.100', function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }
        exchange = 'topic_data';
        channel.assertExchange(exchange, 'topic', {
            durable: false
        });
        amqp_channel = channel;
    });
});

MongoClient.connect(mongoURI, { useNewUrlParser: true }, (err, client) => {
    if (err) throw err;
    const db = client.db('mqtt_db');
    collection = db.collection('mqtt_test_data');
    console.log('Database connected');
});

client.on('message', function (topic, message) {
    var mqtt_data = message.toString();
    collection.insertOne({ topic: topic, data: mqtt_data, date: new Date() }, (err, result) => {
        if (err) throw err;
        console.log(result.ops[0]);
        amqp_channel.publish(exchange, 'test.your.home.data', Buffer.from(mqtt_data));
        console.log("[x] Sent through AMQP: %s", mqtt_data);
    });
});
