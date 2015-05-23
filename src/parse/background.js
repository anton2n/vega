var dl = require('datalib'),
    d3 = require('d3');

module.exports = function parseBg(bg) {
  // return null if input is null or undefined
  if (!dl.isValid(bg)) return null;
  // run through d3 rgb to sanity check
  return d3.rgb(bg) + "";  
};