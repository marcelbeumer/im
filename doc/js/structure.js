(function(ns){
    
    /* ---------------------------------------------------------------------------
    ns references
    --------------------------------------------------------------------------- */
    var doc = ns.doc;
    var tpl = doc.tpl;    
    
    doc.STRUCTURE = {
        intro : {title : "Introduction", content : tpl.template('intro.html')},
        functionsAndChains : {title : "Functions and chains", content : tpl.template('functionsAndChains.html')},
        sampleApplication : {title : "Sample application", content : tpl.template('sampleApplication.html')},
        chaining : {title : "Chaining in detail", content : tpl.template('chaining.html')},
        designPageLoad : {title : "Designing the page load", content : tpl.template('designPageLoad.html')},
        performance : {title : "Performance", content : tpl.template('performance.html')},
        creatingPlugins : {title : "Creating plugins for IM", content : tpl.template('creatingPlugins.html')},
        //internals : {title : "Internal workings", content : tpl.template('internals.html')},
        api : {
            title : 'API reference',
            _sub : {
                core : {
                    content : tpl.template('core.html'),
                    _sub : {
                        functions : {
                            content : tpl.list(),
                            _sub : {
                                im : {source : tpl.source('im/im.core.js', 'im -')},
                                noConflict : {source : tpl.source('im/im.core.js', 'im.noConflict -')},
                                browser : {source : tpl.source('im/im.core.js', 'im.browser -')},
                                isFunction : {source : tpl.source('im/im.core.js', 'im.isFunction -')},
                                isArray : {source : tpl.source('im/im.core.js', 'im.isArray -')},
                                isString : {source : tpl.source('im/im.core.js', 'im.isString -')},
                                merge : {source : tpl.source('im/im.core.js', 'im.merge -')},
                                extend : {source : tpl.source('im/im.core.js', 'im.extend -')},
                                trim : {source : tpl.source('im/im.core.js', 'im.trim -')},
                                proxy : {source : tpl.source('im/im.core.js', 'im.proxy -')},
                                each : {source : tpl.source('im/im.core.js', 'im.each -')}
                            }
                        },
                        chains : {
                            content : tpl.list(),
                            _sub : {
                                reset : {source : tpl.source('im/im.core.js', 'chains.reset -')},
                                end : {source : tpl.source('im/im.core.js', 'chains.end -')},
                                array : {source : tpl.source('im/im.core.js', 'chains.array -')},
                                item : {source : tpl.source('im/im.core.js', 'chains.item -')},
                                el : {source : tpl.source('im/im.core.js', 'chains.el -')},
                                exec : {source : tpl.source('im/im.core.js', 'chains.exec -')},
                                each : {source : tpl.source('im/im.core.js', 'chains.each -')}
                            }
                        }
                    }
                },
                dom : {
                    content : tpl.template('dom.html'),
                    _sub : {
                        functions : {
                            content : tpl.list(),
                            _sub : {
                                getAncestors : {source : tpl.source('im/im.dom.js', 'im.getAncestors -')},
                                getAncestorOrSelf : {source : tpl.source('im/im.dom.js', 'im.getAncestorOrSelf -')},
                                isAncestorOf : {source : tpl.source('im/im.dom.js', 'im.isAncestorOf -')},
                                getFirstChildElement : {source : tpl.source('im/im.dom.js', 'im.getFirstChildElement -')},
                                getChildElements : {source : tpl.source('im/im.dom.js', 'im.getChildElements -')},
                                hasClass : {source : tpl.source('im/im.dom.js', 'im.hasClass -')},
                                addClass : {source : tpl.source('im/im.dom.js', 'im.addClass -')},
                                removeClass : {source : tpl.source('im/im.dom.js', 'im.removeClass -')},
                                toggle : {source : tpl.source('im/im.dom.js', 'im.toggle -')},
                                getUUID : {source : tpl.source('im/im.dom.js', 'im.getUUID -')},
                                hasUUID : {source : tpl.source('im/im.dom.js', 'im.hasUUID -')},
                                data : {source : tpl.source('im/im.dom.js', 'im.data -')},
                                show : {source : tpl.source('im/im.dom.js', 'im.show -')},
                                hide : {source : tpl.source('im/im.dom.js', 'im.hide -')},
                                remove : {source : tpl.source('im/im.dom.js', 'im.remove -')},
                                append : {source : tpl.source('im/im.dom.js', 'im.append -')},
                                appendTo : {source : tpl.source('im/im.dom.js', 'im.appendTo -')},
                                html : {source : tpl.source('im/im.dom.js', 'im.html -')},
                                create : {source : tpl.source('im/im.dom.js', 'im.create -')},
                                attr : {source : tpl.source('im/im.dom.js', 'im.attr -')},
                                removeAttr : {source : tpl.source('im/im.dom.js', 'im.removeAttr -')}
                            }
                        },
                        chains : {
                            content : tpl.list(),
                            _sub : {
                                hasClass : {source : tpl.source('im/im.dom.js', 'chains.hasClass -')},
                                addClass : {source : tpl.source('im/im.dom.js', 'chains.addClass -')},
                                removeClass : {source : tpl.source('im/im.dom.js', 'chains.removeClass -')},
                                toggle : {source : tpl.source('im/im.dom.js', 'chains.toggle -')},
                                data : {source : tpl.source('im/im.dom.js', 'chains.data -')},
                                show : {source : tpl.source('im/im.dom.js', 'chains.show -')},
                                hide : {source : tpl.source('im/im.dom.js', 'chains.hide -')},
                                remove : {source : tpl.source('im/im.dom.js', 'chains.remove -')},
                                append : {source : tpl.source('im/im.dom.js', 'chains.append -')},
                                appendTo : {source : tpl.source('im/im.dom.js', 'chains.appendTo -')},
                                html : {source : tpl.source('im/im.dom.js', 'chains.html -')},
                                create : {source : tpl.source('im/im.dom.js', 'chains.create -')},
                                attr : {source : tpl.source('im/im.dom.js', 'chains.attr -')},
                                removeAttr : {source : tpl.source('im/im.dom.js', 'chains.removeAttr -')}
                            }
                        }
                    }
                },
                events : {
                    content : tpl.template('events.html'),
                    _sub : {
                        functions : {
                            content : tpl.list(),
                            _sub : {
                                bind : {source : tpl.source('im/im.events.js', 'im.bind -')},
                                unbind : {source : tpl.source('im/im.events.js', 'im.unbind -')},
                                live : {source : tpl.source('im/im.events.js', 'im.live -')},
                                die : {source : tpl.source('im/im.events.js', 'im.die -')},
                                onready : {source : tpl.source('im/im.events.js', 'im.onready -')},
                                onload : {source : tpl.source('im/im.events.js', 'im.onload -')}
                            }
                        },
                        chains : {
                            content : tpl.list(),
                            _sub : {
                                bind : {source : tpl.source('im/im.events.js', 'chains.bind -')},
                                unbind : {source : tpl.source('im/im.events.js', 'chains.unbind -')},
                                live : {source : tpl.source('im/im.events.js', 'chains.live -')},
                                die : {source : tpl.source('im/im.events.js', 'chains.die -')}
                            }
                        }
                    }            
                },
                css : {
                    content : tpl.template('css.html'),
                    _sub : {
                        functions : {
                            content : tpl.list(),
                            _sub : {
                                css : {source : tpl.source('im/im.css.js', 'im.css -')},
                                animate : {source : tpl.source('im/im.css.js', 'im.animate -')},
                                stop : {source : tpl.source('im/im.css.js', 'im.stop -')},
                                offset : {source : tpl.source('im/im.css.js', 'im.offset -')},
                                width : {source : tpl.source('im/im.css.js', 'im.width -')},
                                height : {source : tpl.source('im/im.css.js', 'im.height -')}
                            }
                        },
                        chains : {
                            content : tpl.list(),
                            _sub : {
                                css : {source : tpl.source('im/im.css.js', 'chains.css -')},
                                animate : {source : tpl.source('im/im.css.js', 'chains.animate -')},
                                stop : {source : tpl.source('im/im.css.js', 'chains.stop -')},
                                offset : {source : tpl.source('im/im.css.js', 'chains.offset -')},
                                width : {source : tpl.source('im/im.css.js', 'chains.width -')},
                                height : {source : tpl.source('im/im.css.js', 'chains.height -')}
                            }
                        }
                    }
                },
                selector : {
                    content : tpl.template('selector.html'),
                    _sub : {
                        functions : {
                            content : tpl.list(),
                            _sub : {
                                selectNodes : {source : tpl.source('im/im.selector.js', 'im.selectNodes -')}
                            }
                        },
                        chains : {
                            content : tpl.list(),
                            _sub : {
                                find : {source : tpl.source('im/im.selector.js', 'chains.find -')},
                                parents : {source : tpl.source('im/im.selector.js', 'chains.parents -')},
                                parent : {source : tpl.source('im/im.selector.js', 'chains.parent -')},
                                filter : {source : tpl.source('im/im.selector.js', 'chains.filter -')}
                            }
                        }
                    }
                },
                scan : {
                    content : tpl.template('scan.html'),
                    _sub : {
                        scan : {source : tpl.source('im/im.scan.js', 'ns.scan -')},
                        register : {title : 'scan.register', source : tpl.source('im/im.scan.js', 'scan.register -')}
                    }
                }                
            }
        }
    };
    
})(window);
