import csv
import numpy
import scipy.io
import copy
import networkx as nx
import datetime
import calendar
from networkx.algorithms import community
import json


min_year = 2100
max_year = 1990

author_rel_map = {}
authors = []
authors_count = []

with open('blockchain_vis_data_8022.csv') as csvfile:
    csvreader = csv.reader(csvfile, delimiter=',', quotechar='"')
    next(csvreader)
    for row in csvreader:
        author = row[1].split(";")
        year = row[3]
        try:
            y = int(year)
            if y > max_year:
                max_year = y
            if y < min_year:
                min_year = y
        except ValueError:
            continue

        for a in author:
            try:
                a = a.strip()
                a_i = authors.index(a)
                authors_count[a_i] = authors_count[a_i]+1
            except ValueError:
                authors.append(a)
                authors_count.append(1)
        
        for i,a in enumerate(author):
            for j,b in enumerate(author):
                if i>=j:
                    continue
                a = a.strip()
                b = b.strip()
                if a > b:
                    a,b = b,a
                    
                k = '|'.join([a,b,str(y)])
                v = author_rel_map.get(k)
                if v is None:
                    v = 1
                else:
                    v = v + 1
                author_rel_map[k] = v

comms = []

data = {}
data['nodes'] = []
data['links'] = []

com_array = []
com_dict = {}

authors_ = []
authors_count_ = []
for i, v in enumerate(authors_count):
    if v >= 8:
        authors_.append(authors[i])
        authors_count_.append(v)

authors = authors_
authors_count = authors_count_


for y in range(min_year,max_year):
    g = nx.Graph()
    for k,v in author_rel_map.items():
        try:
            a,b,t = k.split('|')
            if y == int(t):
                a_i = authors.index(a)
                b_i = authors.index(b)
                if not g.has_node(a_i):
                    g.add_node(a_i)
                if not g.has_node(b_i):
                    g.add_node(b_i)
                g.add_edge(a_i,b_i)
        except ValueError:
            continue
    communities_generator = community.girvan_newman(g)
    top_level_communities = next(communities_generator)
    c = sorted(map(sorted, top_level_communities))
    comms.append(c)
    g.clear()

g_trans = {}

for i, v in enumerate(comms):
    for j, k in enumerate(v):
        data['nodes'].append({'name':str(i)+'_'+str(j)})
        com_array.append(str(i)+'_'+str(j))

for i, v in enumerate(comms):
    for j, k in enumerate(v):
        for id in k:
            if g_trans.get(id) is None:
                g_trans[id] = str(i)+'_'+str(j)
            else:
                c1 = g_trans[id]
                c2 = str(i)+'_'+str(j)
                g_trans[id] = c2
                if com_dict.get(c1+'|'+c2) is None:
                    com_dict[c1+'|'+c2] = 1
                else:
                    com_dict[c1+'|'+c2] = com_dict[c1+'|'+c2] + 1

for k,v in com_dict.items():
    c = k.split('|')
    data['links'].append({
        'source':com_array.index(c[0]),
        'target':com_array.index(c[1]),
        'value':v
    })

with open('data.json','w') as f:
    json.dump(data,f)
            


        
        

        





    
    
    

