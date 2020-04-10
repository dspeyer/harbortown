#!/bin/bash

(
    echo 'digraph {';
    for i in *; do
        test -d $i || continue
        echo "subgraph cluster_$RANDOM {"
        echo "  label = \"$i\";"
        ls $i/*.js 2>/dev/null |
            sed 's@.*/@@' |
            sed 's/.js//' |
            grep -v '\.' |
            awk '{print "  node []" $0 ";"}'
        echo "}"
    done
    grep import */*.js |
        grep ".js[\"';]*$" |
        sed 's@[a-z]*/@@' |
        sed 's@:.*/@ -> @' |
        sed 's/.js//g' |
        tr -d "'" ;
    echo '}'
) | dot -Tpng | display -
