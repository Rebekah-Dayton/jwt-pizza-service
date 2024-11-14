const config = require('./config.js');
const os = require('os');

class Metrics {
    constructor() {
        this.totalRequests = 0;
        this.deleteRequests = 0;
        this.postRequests = 0;
        this.getRequests = 0;
        this.putRequests = 0;

        this.active_users = 0;
        this.succss_authentication = 0;
        this.failed_authentication = 0;

        this.pizzas_sold = 0;
        this.failed_pizzas = 0;
        this.revenue = 0

        this.pizza_latency = 0;
        this.general_latency = 0;

        this.sendMetricsPeriodically(6000)
    };

    resetValues() {
        this.succss_authentication = 0;
        this.failed_authentication = 0;
        this.pizzas_sold = 0;
        this.failed_pizzas = 0;
    }

    // Periodic Reporting
    sendMetricsPeriodically(period) {
        const timer = setInterval(() => {
        try {
            // Http Requests
            this.sendHttpMetricToGrafana('total_request', 'all', 'total', this.totalRequests);
            this.sendHttpMetricToGrafana('get_request', 'get', 'total', this.getRequests);
            this.sendHttpMetricToGrafana('post_request', 'post', 'total', this.postRequests);
            this.sendHttpMetricToGrafana('delete_request', 'delete', 'total', this.deleteRequests);
            this.sendHttpMetricToGrafana('put_request', 'delete', 'total', this.putRequests);
            // CPU & Memory usage
            this.sendSystemMetricsToGrafana();
            // Active users
            this.sendMetrictoGrafana(`active_users,source=${config.metrics.source} count=${this.active_users}`);
            // Authentication attempts
            this.sendAuthenticationMetricsToGrafana();
            // Pizza data
            this.sendPizzaMetricsToGrafana();
           // Latency data
           this.sendLatencyMetricsToGrafana();

            console.log()
            this.resetValues();
        } catch (error) {
            console.log('Error sending metrics', error);
        }
        }, period);
        timer.unref();
    };

    incrementHttpRequests(type, time) {
        this.general_latency += time;
        this.totalRequests++;
        switch(type) {
            case "get":
                this.getRequests++;
                break;
            case "post":
                this.postRequests++;
                break;
            case "delete":
                this.deleteRequests++;
                break;
            case "put":
                this.putRequests++;
                break;
        };
    }

    incrementUserCount(type, time) {
        this.incrementHttpRequests(type, time);
        this.active_users++;
    }

    decrementUserCount(time) {
        this.incrementHttpRequests("delete", time);
        this.active_users--;
    }

    addAuthAttempt(status, time) {
        if (status) {
            this.incrementUserCount("put", time);
            this.succss_authentication++;
        } else {
            this.incrementHttpRequests("put", time)
            this.failed_authentication++;
        }
    }

    updateOrderMetrics(order, status, time) {
        this.pizza_latency += time;
        this.incrementHttpRequests("post", time);

        if (status) {
            let pizzas = order.items;
            pizzas.forEach((item) => {
                this.pizzas_sold++;
                this.revenue += item.price;
            });
        } else {
            this.failed_pizzas++;
        }
    }

    sendLatencyMetricsToGrafana() {
        const pizza = `pizza_latency,source=${config.metrics.source} delay=${this.pizza_latency}`;
        const general = `request_latency,source=${config.metrics.source} delay=${this.general_latency}`;
        this.sendMetrictoGrafana(pizza);
        this.sendMetrictoGrafana(general);

    }

    sendAuthenticationMetricsToGrafana() {
        const failed = `failed_auth,source=${config.metrics.source} count=${this.failed_authentication}`;
        const success = `success_auth,source=${config.metrics.source} count=${this.succss_authentication}`;
        this.sendMetrictoGrafana(failed);
        this.sendMetrictoGrafana(success);
    }

    sendHttpMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;
        this.sendMetrictoGrafana(metric);
    }

    sendPizzaMetricsToGrafana() {
        const pizza_sold = `pizza_purchases,source=${config.metrics.source} count=${this.pizzas_sold}`;
        const failed_orders = `failed_purchases,source=${config.metrics.source} count=${this.failed_pizzas}`;
        const pizza_profit = `revenue,source=${config.metrics.source} count=${this.revenue}`;
        this.sendMetrictoGrafana(pizza_sold);
        this.sendMetrictoGrafana(failed_orders);
        this.sendMetrictoGrafana(pizza_profit);
    }

    sendSystemMetricsToGrafana() {
        const cpu_metric = `cpu_usage,source=${config.metrics.source} usage=${this.getCpuUsagePercentage()}`;
        const memory_metric = `memory_usage,source=${config.metrics.source} usage=${this.getMemoryUsagePercentage()}`;
        this.sendMetrictoGrafana(cpu_metric);
        this.sendMetrictoGrafana(memory_metric);
    }

    sendMetrictoGrafana(metric) {
        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metric,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        })
        .then((response) => {
            if (!response.ok) {
                console.error(`****Failed to push ${metric} data to Grafana`, response);
            } else {
                console.log(`Pushed ${metric}`);
            }
        })
        .catch((error) => {
            console.error('Error pushing metrics:', error);
        });
    }

    // System Metrics Code
    getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    }

    getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
    }
}

const metrics = new Metrics();
module.exports = metrics;

