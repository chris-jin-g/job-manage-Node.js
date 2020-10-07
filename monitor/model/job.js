var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var JobSchema = new Schema({
    name: { type: String, index: true},
    pid: {type: String},
    start_time: { type: Date, default: Date.now },
    current_partition_time: { type: Date, default: Date.now },
    end_partition_time: { type: Date, default: null },
    frequency: { type: String }, // 'daily' | 'hourly' ...
    latency: { type: Number, default: 0 },
    average_latency: { type: Number, default: 0 },
    average_processing_time: { type: Number, default: 0 },
    author: { type: String },
    status: {type: String },
    message: {type: String }
});

mongoose.model('Job', JobSchema);
