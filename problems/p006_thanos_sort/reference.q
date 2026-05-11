/ Thanos Sort reference solution
/ Recursive: if sorted return n, else max of recursing on each aligned half.

f:{n:count x;$[1=n;1;x~asc x;n;h:n div 2;max(.z.s h#x;.z.s h _ x)]}
func:{f x 1}
