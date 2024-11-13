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

        this.sendMetricsPeriodically(6000)
    };

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

            console.log()
        } catch (error) {
            console.log('Error sending metrics', error);
        }
        }, period);
        timer.unref();
    };

    incrementHttpRequests(type) {
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

    incrementUserCount(type) {
        this.incrementHttpRequests(type);
        this.active_users++;
    }

    decrementUserCount() {
        this.incrementHttpRequests("delete");
        this.active_users--;
    }

    addAuthAttempt(status) {
        this.incrementHttpRequests("put")
        if (status) {
            this.incrementUserCount();
            this.succss_authentication++;
        } else {
            this.failed_authentication++;
        }
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
                console.error('Failed to push metrics data to Grafana', response);
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

    // Purchase Metrics Code
    // TODO: track purchases - how long, how many, how much, success

}

const metrics = new Metrics();
module.exports = metrics;

