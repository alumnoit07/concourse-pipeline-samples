var express = require('express'),
  http = require('http'),
  path = require('path'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  logger = require('morgan'),
  fs = require('fs'),
  url = require('url'),
  request = require('request');

var app = express();

var NumberBlackBox = require('./src/NumberBlackBox.js');
var app_port_number = process.env.PORT || 3000;

app.set('port', app_port_number);
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(methodOverride());

app.get('/metric', function(req, res) {   // serve image files
  var vcap_app = process.env.VCAP_APPLICATION || '{ "application_name":"","application_version":"","application_uris":""}';
  var app_obj = JSON.parse(vcap_app)

  // custom payload metrics
  var data = { "applications": [{
               "id": "[app_guid]",
               "instances": [{
                  "id": "[instance_guid]",
                  "index": "0",
                  "metrics": [{
                    "name": "[metric_name]",
                    "type": "gauge",
                    "value": "[metric_value]",
                    "timestamp": "[timestamp]",
                    "unit": "[metric_unit]"
                  }]
                }]
              }]
            };

  data.applications[0].id = "f652475f-0702-4766-9879-4a9f2cdae5a9";
  data.applications[0].instances[0].id = "b5561202-ebb1-40f3-7865-ce04";
  data.applications[0].instances[0].metrics[0].name = "a-metric";
  data.applications[0].instances[0].metrics[0].value = 0;
  data.applications[0].instances[0].metrics[0].timestamp = 1542819282000;
  data.applications[0].instances[0].metrics[0].unit = "seconds";

  var payload = JSON.stringify(data);

  // send custom message to Metrics Forwarder for PCFll
  request({ method: 'POST',
            url: 'https://metrics-forwarder.run.pivotal.io/v1/metrics',
            headers: {'Authorization': "96b4111e-daf2-40ba-4117-4f0e23b658b6"},
            body: payload
          }, function (error, response, body) {
            if(error) return res.send(error);
            //if(error) return;

            if(response.statusCode != "200") {
                console.error('Error sending custom message :', payload);
                
                return res.send(response);

                /*console.log('Status:', response.statusCode);
                console.log('Headers:', JSON.stringify(response.headers));
                console.log('Response:', body);

                return;*/
            }

            console.log('Status:', response.statusCode);
            console.log('Headers:', JSON.stringify(response.headers));
            console.log('Response:', body);

            console.log('The commandd was correctly', payload);

            res.send(payload);
          });
});

app.get('/images/*', function(req, res) {   // serve image files
  var request = url.parse(req.url, true);
  var action = request.pathname;
  var img = fs.readFileSync('.'+request.pathname);
  res.writeHead(200, {'Content-Type': 'image/gif' });
  res.end(img, 'binary');
});

app.all('/', function(req, res) {   // serve all other requests
  var vcap_app=process.env.VCAP_APPLICATION || '{ "application_name":"","application_version":"","application_uris":""}';
  var app_obj = JSON.parse(vcap_app)
  var icon_name = (app_obj.application_name.indexOf("blue")>= 0)?"Blue-station.png":"Green-station.png";
  res.writeHead(200, {"Content-Type": "text/html; charset=UTF-8"});
  res.write("<html><body style='font-family: Arial'><img align='left' src='./images/Blue-Green-icon.png'>");
  res.write("<h1><br><br><br>&nbsp;&nbsp;Blue-Green deployments</h1><hr>");
  res.write("<p><img src='./images/"+icon_name+"'></p>");
  res.write("<hr>");
  res.write("<p><b>Application name:</b> "+ app_obj.application_name+"</p>");
  res.write("<p><b>Application version:</b> "+ app_obj.application_version+"</p>");
  res.write("<p><b>Application URIs:</b> "+ app_obj.application_uris+"</p>");
  res.write("<hr><p><b>VCAP_APPLICATION:</b> "+ JSON.stringify(app_obj,null,'\t')+"</p>");
  res.write("<hr><p>Current time: "+new Date().toString()+"</p><hr/>");
  res.write("</body></html>");
  res.end("\n");

});

var server = http.createServer(app);
var boot = function () {
  server.listen(app.get('port'), function(){
    console.info('Blue-Green-App-Test listening on port ' + app.get('port'));
  });
}
var shutdown = function() {
  server.close();
}
if (require.main === module) {
  boot();
} else {
  console.info('Running app as a module')
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get('port');
}
