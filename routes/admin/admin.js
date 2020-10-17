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
    response.render("admin_Page1")
})

app.get("/register",function(req,res){
    res.render("adRegister",{message:null})
})

app.post("/register",function(request,response){
        const id=request.body.id;
        const pass=request.body.pass;
            db.query('select Admin_ID from Hotel_Admin where Admin_ID= ?',id,function(error,results){
                if(results.length>0){
                    response.render("adminLogin",{message:"Admin is already registered"});
                }
                else{
                bcrypt.genSalt(8,function(err,salt){
                    if(err)
                    console.log(err)
                    bcrypt.hash(pass,salt,function(err,hash){
                        if(err)
                        console.log(err)
                        else{
                            let admin={
                            Admin_ID:id,
                            Admin_Password:hash
                            }
                            let sql = "insert into Hotel_Admin SET ?"
                            let query = db.query(sql, admin, (err, result) => {
                                if(err) throw err;
                                response.render("adminLogin",{message:"you have been registered"})
                            });
                        }
                        
                    });
    
                })
                
            } 
            })
})

app.get("/login",function(request,response){
    response.render("adminLogin",{message:null})
})

app.post("/login",function(req,res){
    const id=req.body.id;
    const pass=req.body.pass;
    if(!id || !pass)
    res.render("login",{message:"enter all the fields"})

    db.query("Select * from hotel_admin where Admin_ID= ?",id,function(err,results){
        if(!results)
        res.render("adminLogin",{message:"customer is not registered"})
        if(!(bcrypt.compare(pass,results[0].Admin_Password)))
        res.render("adminLogin",{message:"wrong password"})
        else{
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
            res.status(200).redirect("/admin/dashboard")
        }
    })
})

app.get("/dashboard",isAuthenticated,function(request,response){
    response.render("adDashboard")
})

app.get("/requests",isAuthenticated,function(req,res){
    let sql="select * from room_info r1,room_detail r2,booking b1 where r1.room_ID=r2.room_ID and r1.booking_id=b1.booking_id"
    db.query(sql,function(err,results){
        res.render("adRequests",{requests:results})
    })
})

app.post("/approve",isAuthenticated,function(req,res){
    const id=req.body.id;
    const pID=req.body.pID;
    let sql="update room_detail set Vacancy='No' where Room_ID=?";
    db.query(sql,id,function(err,results){
        if(err){console.log(err)}
    })
    let sql1="update booking set Approval='Yes' where Booking_ID=(select Booking_ID from room_info where Room_ID=?)";
    db.query(sql1,id,function(err,results){
        if(err){console.log(err)}
    })
    let sql2="insert into payment_info  SET ?";
    const pay1={
        Payment_ID:pID,
        Payment_Date:null,
        Payment_Type:null,
        Payment_Amount:null,
        Customer_ID:req.body.cid
    }
    let sql3="insert into Payment_Amount_Detail  SET ?";
    const pay2={
        Payment_ID:pID,
        Additional_Amount:0,
        Additional_Discount:0
    }
    db.query(sql2,pay1,(err,results)=>{
        if(err){console.log(err)}
    })
    db.query(sql3,pay2,(err,results)=>{
        if(err){console.log(err)}
        res.redirect("/admin/requests")
    })
})

app.post("/disapprove",isAuthenticated,function(req,res){
    const cid=req.body.cid;
    let sql1="delete from booking where Customer_ID=?";
    let sql2="delete from room_info where Booking_ID=(select Booking_ID from booking where Customer_ID=?)";
    db.query(sql2,cid,function(err,results){
        if(err){console.log(err)}
    })
    db.query(sql1,cid,function(err,results){
        if(err){console.log(err)}
        res.send("deleted")
    })
})

app.get("/service",isAuthenticated,(req,res)=>{
    res.render("adService")
})

app.post("/service",isAuthenticated,(req,res)=>{
    let service1={
        Service_ID:req.body.id,
        Service_Name:req.body.name
    }
    let service2={
        Service_Name:req.body.name,
        Service_Desc:req.body.desc,
        Service_Amount:req.body.amount
    }
    db.query("insert into service_info SET ?",service1,(err,results)=>{
        if(err){console.log(err)}
    })
    db.query("insert into service_detail SET ?",service2,(err,results)=>{
        if(err){
            console.log(err)
        }
        res.redirect("/admin/dashboard")
    })
})

app.get("/res",isAuthenticated,(req,res)=>{
    res.render("adRest")
})

app.post("/res",isAuthenticated,(req,res)=>{
    let res1={
        Restaurant_ID:req.body.id,
        Name:req.body.name,
        Type:req.body.type
    }
    let res2={
        Type:req.body.type,
        meal_menu:req.body.meal,
        amount:req.body.amount
    }
    db.query("insert into restaurant SET ?",res1,(err,results)=>{
        if(err){console.log(err)}
    })
    db.query("insert into meal SET ?",res2,(err,results)=>{
        if(err){
            console.log(err)
        }
        res.redirect("/admin/dashboard")
    })
})

app.get("/logout",function(req,res){
    res.clearCookie('jwt');
    res.redirect("/");
})





module.exports=app;