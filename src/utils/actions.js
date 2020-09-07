const AV = require('leancloud-storage')
const Cloudant = require('cloudant');
const cloudant = new Cloudant({
    account: 'cf7bdc5e-0dc7-461b-bbf5-e2f13939cc30-bluemix',
    // url: 'https://cf7bdc5e-0dc7-461b-bbf5-e2f13939cc30-bluemix.cloudantnosqldb.appdomain.cloud',
    plugins: {
      iamauth: {
        iamApiKey: '9ze4jmBVliP_G7jl1iUIRqpLAMYgJ2wywmikcTB7TiMA'
      }
    }
  });

function login(id, key, serverURLs) {
    // cloudant.db.list(function(err, body) {
    //     body.forEach(function(db) {
    //       console.log(db);
    //     });
    //   });
    cloudant.db.create('test', function(err, data) {
        console.log('Error:', err);
        console.log('Data:', data);
      });
    
    try {
        AV.init({
            appId: id,
            appKey: key,
            serverURLs: serverURLs,
        });
    } catch (ex) { }
}

function createACL() {
    let acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    return acl;
}

function getAcl() {
    let acl = new AV.ACL();
    acl.setPublicReadAccess(!0);
    acl.setPublicWriteAccess(!1);
    return acl;
}

function createCounter() { 
    return function (Counter, o) {
        saveComment(Counter, o);
    };

    function saveComment(Counter, o) {
        let newCounter = new Counter();
        let acl = new AV.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        newCounter.setACL(acl);
        newCounter.set('url', o.url);
        newCounter.set('xid', o.xid);
        newCounter.set('title', o.title);
        newCounter.set('time', 1);
        newCounter.save().then(ret => {
            Utils.find(o.el, '.leancloud-visitors-count').innerText = 1;
        }).catch(ex => {
            console.log(ex);
        });
    }
}

let CounterFactory = {
    add(Counter,currPath) {
        let root = this
        let lvs = Utils.findAll(document, '.leancloud_visitors,.leancloud-visitors');
        if (lvs.length) {
            let lv = lvs[0];
            let url = Utils.attr(lv, 'id');
            let title = Utils.attr(lv, 'data-flag-title');
            let xid = encodeURI(url);
            let o = {
                el: lv,
                url: url,
                xid: xid,
                title: title
            }
            // 判断是否需要+1
            if (decodeURI(url) === decodeURI(currPath)) {
                let query = new AV.Query(Counter);
                query.equalTo('url', url);
                query.find().then(ret => {
                    if (ret.length > 0) {
                        let v = ret[0];
                        v.increment("time");
                        v.save().then(rt => {
                            Utils.find(lv, '.leancloud-visitors-count').innerText = rt.get('time')
                        }).catch(ex => {
                            console.log(ex)
                        });
                    } else {
                        createCounter(Counter, o)
                    }
                }).catch(ex => {
                    ex.code == 101 && createCounter(Counter, o)
                })
            } else CounterFactory.show(Counter, lvs)
        }
    },
    show(Counter, lvs) {
        let COUNT_CONTAINER_REF = '.leancloud-visitors-count';

        // 重置所有计数
        Utils.each(lvs, (idx, el) => {
            let cel = Utils.find(el, COUNT_CONTAINER_REF);
            if (cel) cel.innerText = 0
        })
        let urls = [];
        for (let i in lvs) {
            if (lvs.hasOwnProperty(i)) urls.push(Utils.attr(lvs[i], 'id'))
        }
        if (urls.length) {
            queryCounter(Counter, urls, COUNT_CONTAINER_REF);
        }
    }
}

function queryCounter(Counter, urls, COUNT_CONTAINER_REF) {
    let query = new AV.Query(Counter);
    query.containedIn('url', urls);
    query.find().then(ret => {
        if (ret.length > 0) {
            Utils.each(ret, (idx, item) => {
                let url = item.get('url');
                let time = item.get('time');
                let els = Utils.findAll(document, `.leancloud_visitors[id="${url}"],.leancloud-visitors[id="${url}"]`);
                Utils.each(els, (idx, el) => {
                    let cel = Utils.find(el, COUNT_CONTAINER_REF);
                    if (cel)
                        cel.innerText = time;
                });
            });
        }
    }).catch(ex => {
        console.error(ex);
    });
}

module.exports={
    login: login,
    createACL: createACL,
    createCounter: createCounter,
    CounterFactory: CounterFactory,
    getAcl: getAcl
}
