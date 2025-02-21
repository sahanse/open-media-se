import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {createQuery,updateQuery, deleteQuery, readQuery} from "pgcrudify";
import {verifyBody} from "../utils/ReqBodyVerifier.js"
import db from "../db/index.js"

const addCategory = AsyncHandler(async(req, res)=>{
    //make sure req.admin is available
    if(!req.admin) throw new ApiError(400, "unauthorized access from");
    
    //make sure req.body is fine
    const requiredFields =["title", "description", "child_safe"]
    const checkReqBody = await verifyBody(req.body, requiredFields, 3);

    //get all equired datas from req.body
    const {title, description, child_safe} = req.body;

    //save data into category table
    const saveCategory = await createQuery(db, "category", {title, description, child_safe},["id"]);
    if(saveCategory.rowCount === 0) throw new ApiError(400, "something went wrong make sure all data provided are correct");
    const categoryId = saveCategory.rows[0].id;

    return res
    .status(200)
    .json(new ApiResponse(200, {id:categoryId, title, description, child_safe}, "Succesfully added new category"));

});

const deleteCategory = AsyncHandler(async(req, res)=>{
    //make sure req.admin is available
    if(!req.admin) throw new ApiError(400, "unauthorized access from");
    
    //make sure req.body is fine
    const requiredFields =["id"]
    const checkReqBody = await verifyBody(req.body, requiredFields, 1);

    //get all equired datas from req.body
    const {id} = req.body;

    //delete the category
    const deleteCategory = await deleteQuery(db, "category", {id});
    if(deleteCategory.rowCount ===0) throw new ApiError(400, "something went wrong make sure data provided is correct");

    return res
    .status(200)
    .json(new ApiResponse(200, {id}, "success fully deleted the category"))

});

const updateCategory = AsyncHandler(async(req, res)=>{
    //make sure req.admin is available
    if(!req.admin) throw new ApiError(400, "unauthorized access from");
    
    //make sure req.body is fine
    const requiredFields =["id", "title", "description", "child_safe"]
    const checkReqBody = await verifyBody(req.body, requiredFields);

    const id = req.body.id;
    //get all equired datas from req.body
    const updateData={}
    for(let val in req.body){
        if(val !== "id"){
            updateData[val] = req.body[val]
        }
    }
    
    const bodyKeys = Object.keys(req.body);
    
    //update the data 
    const updateCategory = await updateQuery(db, "category", updateData, {id}, ["id", "title"]);
    if(updateCategory.rowCount === 0) throw new ApiError(400, "something went wrong make sure all provided datas are correct");

    return res
    .status(200)
    .json(new ApiResponse(200, updateData, "sucessfully updated category"))
});

const getCategory = AsyncHandler(async(req, res)=>{
    const getCategory = await readQuery(db, "category", ["id", "title", "description", "child_safe"]);
    
    let categoryData = [];
    if(getCategory.rowCount >0){
        categoryData = getCategory.rows;
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, categoryData, "successfully fetched category data"))
});

export {addCategory, deleteCategory, updateCategory, getCategory}