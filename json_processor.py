import json

with open('../musiccodes/server/experiences/visualtest.json') as data_file:
    data = json.load(data_file)
 #   print data;
length = len(data['markers'])
for i in xrange (0, length):
    print i
    title = data['markers'][i]['title']
    data['markers'][i]['actions'].append({'visual': title})


# print data
with open('../musiccodes/server/experiences/visualtest.json', 'w') as outfile:
    json.dump(data,outfile)

# ob = json.dumps(data)
# print ob;
# oj = ob[1]
# print oj;