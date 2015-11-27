var path = require('path')
var posthtml = require('posthtml')
var request = require('request')
var fs = require('fs')

function LinkImport(customElementTagName, uri, originURI) {
  this.customElementTagName = customElementTagName
  this.uri = uri
  this.originURI = originURI
}

LinkImport.prototype.load = function() {
  return new Promise(function (resolve, reject) {
    if (/^http:\/\//.test(this.uri)) {
      request(this.uri, function(error, response, body) {
        if (error) {
          reject(error)
        } else {
          this.source = body
          resolve('loaded')
        }
      }.bind(this))
    } else {
      fs.readFile(this.uri, 'utf-8', function (error, data) {
        if (error) {
          reject(error)
        } else {
          this.source = data
          resolve('loaded')
        }
      }.bind(this))
    }
  }.bind(this))
}

LinkImport.prototype.loaded = function () {
  return !!this.source
}

LinkImport.prototype.getCustomElementTagName = function () {
  return this.customElementTagName
}

LinkImport.prototype.getStyles = function () {
  return this.parts.styles
}

LinkImport.prototype.getScripts = function () {
  return this.parts.scripts
}

LinkImport.prototype.getHTML = function () {
  return this.parts.html
}

LinkImport.prototype.prepare = function () {
  var parts = this.parts = {
    styles: [],
    scripts: [],
    html: {}
  }
  posthtml().use(function(tree) {
    tree.walk(function (node) {
      if (node.tag === 'script') {
        parts.scripts.push(node)
        // remove script node from template
        return undefined
      } else if (node.tag === 'style' || (node.tag === 'link' && node.attrs.rel ==='stylesheet')) {
        parts.styles.push(node)
        // remove style node from template
        return undefined
      } else if (node.tag === 'template') {
        // if LinkImport has an template tag, use it's innerHTML as custom element's html
        parts.html = node.content
      }
      return node
    })
    // if no template tag, use itself as custom element's html
    this.parts.html || (this.parts.html = tree)
  }.bind(this)).process(this.source, {sync: true})
}
LinkImport.parse = function (node, options) {
  if (!(options && options.hostURI)) {
    throw new Error('The base uri is need in options')
  }
  var customElementTagName, url, originURI
  originURI = node.attrs.href
  if (/^(http|https):\/\//.test(originURI)) {
    uri = originURI
  } else {
    uri = path.resolve(path.dirname(options.hostURI), originURI)
  }
  var fileInfo = path.parse(uri)
  customElementTagName = fileInfo.name
  return new LinkImport(customElementTagName, uri, originURI)
}

module.exports = LinkImport
