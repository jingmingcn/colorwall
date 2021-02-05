import csv
import numpy
import scipy.io
import copy

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
                if i>j:
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

# threshold = 1
# while len(authors) > 100:

#     print('threshold:',threshold,' len of authors:', len(authors))

#     authors_ = []
#     authors_count_ = []

#     for i,v in enumerate(authors):
#         if authors_count[i] > threshold:
#             authors_.append(v)
#             authors_count_.append(authors_count[i])

#     authors = authors_
#     authors_count = authors_count_
#     threshold = threshold + 1

# authors_ = copy.deepcopy(authors)

# for k,v in author_rel_map.items():
#     a,b,t = k.split('|')
#     try:
#         a_i = authors_.index(a)
#     except ValueError:
#         a_i = -1
    
#     try:
#         b_i = authors_.index(b)
#     except ValueError:
#         b_i = -1

#     if a_i != -1 or b_i != -1:
#         try:
#             a_i = authors.index(a)
#         except ValueError:
#             authors.append(a)

#         try:
#             b_i = authors.index(b)
#         except ValueError:
#             authors.append(b)

N = len(authors)
T = max_year - min_year + 1
data = numpy.zeros(shape=(N,N,T))

for k,v in author_rel_map.items():
    try:
        a,b,t = k.split('|')
        a_i = authors.index(a)
        b_i = authors.index(b)
        t = int(t) - min_year
        data[a_i,b_i,t] = v
    except ValueError:
        continue

#print(data)

# scipy.io.savemat('pisces_data.mat',{'A':data})
#numpy.savetxt('d0.txt',data[:,:,0])




    
    
    

