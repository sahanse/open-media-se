/* 
1) get: /get-otp:
1.1) verify user has accesstoken and refreshtoken in cookie

1.2) get userinfo from accesstoken

1.3) check waether user exists in db

1.4) if yes send req.user containing user info 

1.5) generate otp and save it in opt table with 
userid fk from req.user add expiry 3 mins ahead

1.6) send otp to email and success response to postman

-----

2) post : /verify-otp:-

2.1) send otp received in json to this route with post req

2.2) get accesstoken and refreshtoken from cookie verify user and add req.user

2.3) get otp table data and see for which service user is requesting 
opt like email or password if same as the route continue 

2.4) check both otp are same make the otp active send success response

----------

3) post: /update-pass:-

3.1) verify user cookie and user has permission to upate password
by using id and finding into otp table 

3.2) if yes then update  pass and clean otp table

*/


/*
otp table schema:-
id,
userid,
otp,
active def false,
applyon,
createdat,
expiry

*/
