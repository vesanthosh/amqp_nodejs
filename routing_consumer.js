var amqp = require('amqplib/callback_api');


amqp.connect('amqp://192.168.99.100', function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }
        var exchange = 'direct_data';

        channel.assertExchange(exchange, 'direct', {
            durable: false
        });

        channel.assertQueue('dummyqueue', {
            exclusive: false
        }, function (error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(' [*] Waiting for logs. To exit press CTRL+C');

            channel.bindQueue(q.queue, exchange, "routingkey1");

            channel.consume(q.queue, function (msg) {
                console.log(" [x] %s: '%s'", msg.fields.routingKey, msg.content.toString());
            }, {
                    noAck: true
                });
        });
    });
});
