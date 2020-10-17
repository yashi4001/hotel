const express=require('express');
const bodyParser=require('body-parser')
const mysql = require('mysql');
const app=express();
const jwt=require('jsonwebtoken')
const bcrypt=require('bcryptjs');
const { response } = require('express');
const {isAuthenticated}=require("../../auth/isAuthenticated")
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

const db = mysql.createConnection({
    host     : 'localhost',
    user     : process.env.user,
    password : process.env.password,
    database : 'hotel'
});

// Connect
db.connect((err) => {
    if(err){
        throw err;
    }
    console.log('MySql Connected...');
});

app.get("/",function(request,response){
    response.render("cust_Page1")
})



app.get("/getBooking",isAuthenticated,function(request,response){
    const cID=request.id;
    let sql = "select * from booking where Customer_ID=?";
    let sql2="select * from payment_info where Customer_ID=?";
    db.query(sql, cID, (err, results) => {
        if(results.length>0){
            db.query(sql2,cID,(errq,fresult)=>{
                if(fresult.length>0){
                    if(fresult[0].Payment_Amount===5000){
                        let query="select * from room_info r1 natural join room_detail r2 where r1.Booking_ID=(select Booking_ID from Booking where Customer_ID=?)"
                        db.query(query,cID,(err,details)=>{
                            response.render("paymentDone",{results:details[0]})
                        })
                    }
                    else
                    response.render("makePayment")
                }
                else
                response.render("viewRequest",{x:1});
            })
        }
        else{
            response.render("noBooking")
        }
    
            
    });
})

app.get("/register",function(request,response){
    response.render("register",{message:null});
})

app.get("/login",function(request,response){
    response.render("customerLogin",{message:null})
})

app.post("/register",function(request,response){
    const id=request.body.id;
    const first=request.body.firstName;
    const last=request.body.lastName;
    const dob=request.body.dob;
    const pass=request.body.pass;
    console.log(first)
        db.query('select Customer_ID from Cus_Info where Customer_ID= ?',id,function(error,results){
            if(results.length>0){
                response.render("customerLogin",{message:"Customer is already registered"});
            }
            else{
            bcrypt.genSalt(8,function(err,salt){
                if(err)
                console.log(err)
                bcrypt.hash(pass,salt,function(err,hash){
                    if(err)
                    console.log(err)
                    else{
                        let cust={
                        Customer_ID:id,
                        Cus_DOB:dob,
                        password:hash
                        }
                        let sql = "insert into Customer_Detail SET ?"
                        let query = db.query(sql, cust, (err, result) => {
                            if(err) throw err;
                        });
                        let cust1={
                            Customer_ID:id,
                            Cus_First_Name:first,
                            Cus_Last_Name:last
                        }
                        
                        let sql1 = "insert into Cus_Info SET ?"
                        let query1 = db.query(sql1, cust1, (err, result) => {
                            if(err) throw err;
                            else{
                                response.render("customerLogin",{message:"You have been registered"})
                            }
                        });
                    }
                    
                });

            })
        }
            
            
        })

})

app.post("/login",function(req,res){
    const id=req.body.id;
    const pass=req.body.pass;
    if(!id || !pass)
    res.render("customerLogin",{message:"enter all the fields"})
    else{
    db.query("Select * from customer_detail where Customer_ID= ?",id,function(err,results){
        if(results.length===0)
        res.render("customerLogin",{message:"customer is not registered"})
        else {
        bcrypt.compare(pass,results[0].password,(err,info)=>{
            if(info){
                const id=req.body.id;
            const token=jwt.sign({id:id},process.env.JWT_SECRET,{
                expiresIn:process.env.JWT_EXPIRESIN
            })
            const cookieOptions={
                expires:new Date(
                    Date.now()+process.env.Cookie_Expire*24*60*60*1000
                ),
                httpOnly:true
            }
            res.cookie('jwt',token,cookieOptions)
            res.status(200).redirect("/customer/dashboard")
            }
            else
            res.render("customerLogin",{message:"wrong password"})
        })
        }
    })
    }

})

app.get("/dashboard",isAuthenticated,function(req,res){
    console.log(req.id)
    //res.render("dashboard",{id:req.id})
    res.render("custDash",{id:req.id})
})

app.get('/logout', function(req,res){
    res.clearCookie('jwt');
    res.redirect("/");
})

app.get("/newBooking",isAuthenticated,function(req,res){
    let id=req.id;
     db.query("select * from booking where Customer_ID=?",id, async function(err,results){
         try{
             if(results.length===0){
                 db.query("select * from room_detail where room_id NOT IN(select r1.room_ID from room_info r1,room_detail r2,booking b1 where r1.room_ID=r2.room_ID and r1.booking_id=b1.booking_id)",(err,info)=>{
                     if(err){console.log(err)}
                     res.render("newBook",{info:info});

                 })
             }
             else
             res.render("bookingMade")
         }
         catch(e){
             res.send(e)
         }
    })
    
})

app.post("/newBooking",isAuthenticated,function(req,res){
            let booking={
                booking_id:req.body.bId,
                booking_type:req.body.btype,
                approval:"No",
                Check_In:null,
                Check_Out:null,
                Customer_ID:req.id
            }
            let room={
                Room_ID:req.body.rID,
                Booking_ID:req.body.bId
            }
            let sql = "insert into Booking SET ?"
            let query = db.query(sql, booking, (err, result) => {
                if(err) throw err;
                console.log(result);
            });
            let query1=db.query("insert into Room_Info SET ?",room,(err,results)=>{
                if(err)
                console.log(err)
                res.render("viewRequest",{x:2})
            })
    
    
})

app.get("/payment",isAuthenticated,(req,res)=>{
    const customer_id=req.id;
    let sql="select payment_id from payment_info where customer_id=?"
    let query=db.query(sql,customer_id,(err,results)=>{
        if(err){console.log(err)}
        const Payment_ID=results[0].payment_id;
        res.render("confirmPayment",{id:Payment_ID,message:null})
    })
})

app.post("/acceptPayment",isAuthenticated,(req,res)=>{
    const pid=req.body.pid;
    const method=req.body.method;
    const amount=req.body.amount;
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    if(amount!=5000|| !amount){
        res.render("confirmPayment",{id:pid,message:"please enter the correct amount"})
    }
    else{
        let change={
            payment_date:dateTime,
            payment_type:method,
            payment_amount:amount
        }
        let answer=[change,pid]
        let sql="update payment_info set ? where payment_ID=?"
        db.query(sql,answer,(err,results)=>{
            if(err){console.log(err)}
            res.redirect("/customer/dashboard")
        })
    }
    console.log(pid)
})

app.get("/checkOut",isAuthenticated,(req,res)=>{
    let id=req.id;
    db.query("select * from payment_info natural join payment_amount_detail where payment_info.Customer_ID=?",id,(err,results)=>{
        if(err){console.log(err)}
        let no=5000+results[0].Additional_Amount-results[0].Additional_Discount;
        if(no===5000){
            db.query("update room_detail set Vacancy='Yes' where Room_ID=(select Room_ID from room_info where Booking_ID=(select Booking_ID from booking where Customer_ID=?))",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from room_info where Booking_ID=(select Booking_ID from booking where Customer_ID=?)",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from booking where Customer_ID=?",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from payment_amount_detail where Payment_ID=(select Payment_ID from payment_info where Customer_ID=?)",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from payment_info where Customer_ID=?",id,(err,results)=>{
                if(err){console.log(err)}
                res.redirect("/customer/dashboard")
            })
        }
        else{
            no=no-5000;
            res.render("finalCheckout",{amount:no,message:null})
        }
    })
})

app.post("/checkOut",isAuthenticated,(req,res)=>{
    let id=req.id;
    let amnt=req.body.amnt;
    db.query("select * from payment_info natural join payment_amount_detail where payment_info.Customer_ID=?",id,(err,results)=>{
        if(amnt.toString()===(results[0].Additional_Amount-results[0].Additional_Discount).toString()){
            if(err){console.log(err)}
            db.query("update room_detail set Vacancy='Yes' where Room_ID=(select Room_ID from room_info where Booking_ID=(select Booking_ID from booking where Customer_ID=?))",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from room_info where Booking_ID=(select Booking_ID from booking where Customer_ID=?)",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from booking where Customer_ID=?",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from payment_amount_detail where Payment_ID=(select Payment_ID from payment_info where Customer_ID=?)",id,(err,results)=>{
                if(err){console.log(err)}
            })
            db.query("delete from payment_info where Customer_ID=?",id,(err,results)=>{
                if(err){console.log(err)}
                res.redirect("/customer/dashboard")
            })
        }
        else{
            res.render("finalCheckout",{amount:results[0].Additional_Amount-results[0].Additional_Discount,message:"Pay the correct amount"})
        }
    })
   
})

app.get("/service",isAuthenticated,(req,res)=>{
    db.query("select * from service_info natural join service_detail",(err,results)=>{
        if(err)(console.log(err))
        res.render("serviceDisplay",{ser:results})
    })
})

app.post("/service",isAuthenticated,(req,res)=>{
    const amnt=req.body.amount;
    const id=req.id;
    db.query("update payment_amount_detail set Additional_Amount=Additional_Amount+? where Payment_ID=(select Payment_ID from payment_info where Customer_id=?)",[amnt,id],(err,results)=>{
        if(err){console.log(err)}
        res.redirect("/customer/service")
    })
    
})

app.get("/restaurant",isAuthenticated,(req,res)=>{
    db.query("select * from restaurant natural join meal",(err,results)=>{
        if(err)(console.log(err))
        res.render("resDisplay",{res:results})
    })
})

app.post("/restaurant",isAuthenticated,(req,res)=>{
    const amnt=req.body.amount;
    const id=req.id;
    db.query("update payment_amount_detail set Additional_Amount=Additional_Amount+? where Payment_ID=(select Payment_ID from payment_info where Customer_id=?)",[amnt,id],(err,results)=>{
        if(err){console.log(err)}
        res.redirect("/customer/restaurant")
    })
    
})

module.exports=app;