/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.xml.js
based on suave.util.xml

The MIT License

Copyright (c) 2008 
Marcel Beumer (marcel@marcelbeumer.nl) 
Vincent Hillenbrink (vincent@vincent.net)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(){
    
    var im = window.im;
    if (!im) return;
    
    var ns = im.xml = im.xml || {};
    
    var activeXIdentifiers = {
        FreeThreadedDOMDocument : ['MSXML2.FreeThreadedDomDocument.3.0', 'MSXML2.FreeThreadedDomDocument'],
        DOMDocument : ['Msxml2.DOMDocument.3.0', 'MSXML2.DOMDocument', 'MSXML.DOMDocument', 'Microsoft.XMLDOM'],
        XSLTemplate : ['MSXML2.XSLTemplate.3.0', 'MSXML2.XSLTemplate'],
        XMLHTTP : ['MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP']
    };

    var getActiveXObject = function(identifiers) {
        for(var x = 0; x < identifiers.length; x++) {
            try{
                var ob = new ActiveXObject(identifiers[x]);
                return ob;
            } catch(e) {}
        }
        return null;
    };

    // getDOMDocument will first try to use window.getDOMDocument to be compatible with the MSX command-line build  
    ns.getDOMDocument = function(str) {
        var doc = null;
        
        if (im.browser.msie) {
            var doc = getActiveXObject(activeXIdentifiers.FreeThreadedDOMDocument);
            doc.async = 'false';
            
            if (str) {
                doc.loadXML(str);
            }
        } else {
            if (str) {
                var parser = new DOMParser();
                doc = parser.parseFromString(str, 'text/xml');
            } else {
                doc = document.implementation.createDocument(null, null, null);
            }
        }
        
        return doc;
    };
    
    ns.getDOMDocumentFromString = function(str) {
        return ns.getDOMDocument(str);
    };
        
    ns.serializeXMLDocument = function(document) {
        var serializer = null;
        
        try {
            serializer = new XMLSerializer();
        } catch(e) {
            serializer = {
                serializeToString : function(xmlNode) {
                    return xmlNode.xml;
                }
            };
        }

        if (!serializer) throw new Error('suave.util.xml.serializeXMLDocument - could not create XML serializer object');

        var text = null;
        try {
            text = serializer.serializeToString(document);
        } catch(e) {
            throw new Error('suave.util.xml.serializeXMLDocument - could not serialize document: ' + document);
        }

        return text;
    };
    
    ns.getXSLTProcessor = function() {
        var processor = null;
    
        try {
            // mozilla
            processor = new XSLTProcessor();
        } catch(e) {
            // IE XSLTProcessor 'emulation' object
            
            // private properties
            var processor = null;
            var stylesheet = null;
            // XSLTProcessor object
            return {
                importStylesheet : function(xmlDocument) {
                    
                    var converted = getActiveXObject(activeXIdentifiers.FreeThreadedDOMDocument);
                    
                    xmlDocument.setProperty("SelectionLanguage", "XPath");
                    xmlDocument.setProperty("SelectionNamespaces", "xmlns:xsl='http://www.w3.org/1999/XSL/Transform'");
                    
                    /* 
                    resolve externals is only supported by MSXML 3.0 SP4 and later, but we assume people do not have <SP4
                    because Microsoft released SP5 on October 13, 2004 and <SP4 is not longer available for download.
                    */
                    converted.resolveExternals = true;
                    converted.setProperty("AllowDocumentFunction", true);
                    
                    if (xmlDocument.url && xmlDocument.selectSingleNode('//xsl:*[local-name() = \'import\' or local-name() = \'include\']')) {
                        converted.async = false;
                        converted.load(xmlDocument.url);
                    } else {
                        converted.loadXML(xmlDocument.xml);
                    }
                    
                    stylesheet = converted;
                    
                    var template = getActiveXObject(activeXIdentifiers.XSLTemplate);
                    template.stylesheet = stylesheet;
                    
                    processor = template.createProcessor();
                },
                
                setParameter : function(nsURI, name, value) {
                    if (!stylesheet) {
                        throw new Error('XSLTProcessor (IE) - could not set parameter because no stylesheet is loaded.');
                    }
                    if (nsURI) {
                        processor.addParameter(name, value, nsURI);
                    } else {
                        processor.addParameter(name, value);
                    }
                },
                
                transformToDocument : function(xmlDocument){
                    var input = ns.getDOMDocumentFromString(xmlDocument.xml);
                    processor.input = input;
                    processor.transform();
                    var output = processor.output;
                    var xmlDoc = ns.getDOMDocumentFromString(output);
                    return xmlDoc;
                }
            };
        }
    
        if(!processor) throw new Error('suave.util.xml.getXSLTProcessor - could not create XSLT processor object');
    
        return processor;
    };
    
    /* -------------------------------------------------------
    getXMLResource - will load an XML resource
    Use this for loading XSLT documents, because this will 
    return a document with the .url property, which enables
    msie and standlone hosts to resolve imports and includes
    ------------------------------------------------------- */
    ns.getXMLResource = function(url){
        var doc = null;
        try {
            doc = ns.getDOMDocument();
            doc.async = false;
            doc.load(url);
        } catch(e) {
            throw new Error('TODO: getXMLResource not fully implemented yet.');
            //doc = suave.util.xhr.get(url).responseXML;
        }
        
        if (doc && doc.documentElement) {
            return doc;
        } else {
            throw new Error('suave.util.xml.getXMLResource - could not get valid XML document from ' + url);
        }
    };
    
    ns.selectNodes = function(xmlNode, xpath) {
        if (window.XPathEvaluator) {
            var evaluator = new XPathEvaluator();
            var documentElement = xmlNode.ownerDocument == null ? xmlNode.documentElement : xmlNode.ownerDocument.documentElement;
            var resolver = evaluator.createNSResolver(documentElement);
            var results = evaluator.evaluate(xpath, xmlNode, resolver, 0, null);
            var resultsItem;
            var found = [];
            while (resultsItem = results.iterateNext()) {
                found.push(resultsItem);
            }
            return found;
        } else {
            xmlNode.setProperty("SelectionLanguage", "XPath");
            var result = xmlNode.selectNodes(xpath);
            return result;
        }
    };
    
    im.xslt = function(sourceDocOrURL, xslDocOrURL) {
        
    };
    
})();