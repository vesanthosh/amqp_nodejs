// Mongo Connection
var MongoClient = require('mongodb').MongoClient;
var mongoURI = 'mongodb://user:password@192.168.99.108:27017/mqtt_db';
var collection;

MongoClient.connect(mongoURI, { useNewUrlParser: true }, (err, client) => {
    if (err) throw err;
    const db = client.db('mqtt_db');
    collection = db.collection('mqtt_data');
    console.log('Database connected');
});

// Connection for Elasticsearch
var elasticsearch = require('elasticsearch');
var indexName = 'device001'; // Soon document type will be removed from elasticsearch. So, gave device name as index name.
var typeName = 'logs';
var elasticClient = new elasticsearch.Client({
    host: '192.168.99.110:9200',
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
            cpuPerformance: {
                properties: {
                    cpuCore1: { type: "float" },
                    cpuCore2: { type: "float" }
                }
            },
            createdAt: { type: "date" }
        }
    }
}, function (err, resp, status) {
    if (err) {
        console.log(err);
    } else {
        console.log(resp)
    }
});

// AMQP Connection
var amqp = require('amqplib/callback_api');
amqp.connect('amqp://192.168.99.109', function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }
        var exchange = 'dummyExchange'; // exchange is important, should be different and thats gonna hold your data.

        channel.assertExchange(exchange, 'fanout', {
            durable: false
        });

        channel.assertQueue('dummyQueue', {
            exclusive: false // if you need to queue your data, then this is the place where you have dig. but the queue can be shared between multiple consumer, means that the data through the queue will be shared among them. there is an option to put random queue name by program itself by not mentioning queue name.
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
            channel.bindQueue(q.queue, exchange, '');

            channel.consume(q.queue, function (msg) {
                if (msg.content) {
                    var data = JSON.parse(msg.content);
                    // Storing in Elasticsearch
                    elasticClient.index({
                        index: indexName,
                        type: typeName,
                        id: msg.properties.messageId,
                        body: data
                    }, function (err, resp, status) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(resp)
                        }
                    });
                    // Storing in MongoDB
                    collection.insertOne(data, (mongoError, result) => {
                        if (mongoError) throw mongoError;
                        console.log(result.ops[0]);
                    });

                    console.log(" [x] %s", msg.content.toString());
                }
            }, {
                    noAck: true
                });
        });
    });
});