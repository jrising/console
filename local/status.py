import urllib, urllib2, re

def doit(op, **kw):
    try:
        kw['op'] = op
        kw['pass'] = 'PASSWORD'
        data = urllib.urlencode(kw)
        req = urllib2.Request("http://console.existencia.org/ss/status.php", data)
        response = urllib2.urlopen(req, timeout=5)
        return response.read()
    except:
        print "Cannot perform status %s." % op

def getip():
    try:
        response = urllib2.urlopen('http://checkip.dyndns.com/')
        data = str(response.read())
        return re.compile(r'Address: (\d+\.\d+\.\d+\.\d+)').search(data).group(1)
    except:
        print "Cannot get IP address."

def register(server, name):
    return doit('register', server=server, name=name)

def update(id, msgtype, message):
    return doit('update', id=id, msgtype=msgtype, message=message)

def complete(id):
    return update(id, 'done', 'done')

def notify(id, msgtype, message):
    return doit('notify', id=id, msgtype=msgtype, message=message)
