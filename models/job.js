const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geoCoder = require('../utils/geocoder')

const jobSchema = new mongoose.Schema({
    title : {
        type : String,
        required : [ true , 'Please enter a Jpb title.'],
        trim : true,
        maxlength : [ 100 , 'Job title cannot exceed 100 characters.']
    },
    slug : String,
    description : {
        type : String,
        required : [true , 'Please enter a Job description.'],
        maxlength : [1000 , 'Job description cannot exceed 1000 characters.']
    },
    email : {
        type : String,
        validate : [validator.isEmail, 'Please enter a valid email id.']
    },
    address : {
        type : String,
        required : [true, 'Please enter an address.']
    },
    location : {
        type : {
            type : String,
            enum : ['Point']
        },
        coordinates : {
            type : [Number],
            index : '2dsphere'
        },
        formattedAddress : String,
        city : String,
        state : String,
        zipcode : String,
        country : String
    },
    company : {
        type : String,
        required : [true, 'Please enter the company name']
    },
    industry : {
        type : [String],
        required : true,
        enum : {
            values : [
                'Business',
                'IT',
                'Banking',
                'Education/Training',
                'Telecommunication',
                'Others'
            ],
            message : 'Please select proper option for industry.'
        }
    },
    jobType : {
        type : String,
        required : true,
        enum : {
            values : [
                'Permanent',
                'Temporary',
                'Internship'
            ],
            message : 'Please select correct options for job type.'
        }
    },
    minEducation : {
        type : String,
        required : true,
        enum : {
            values : [
                'Bachelors',
                'Masters',
                'PhD'
            ],
            message : 'Please select correct options for min education required.'
        }
    },
    positions : {
        type : Number,
        default : 1
    },
    experience : {
        type : String,
        required : true,
        enum : {
            values : [
                'No Experience',
                '1-2 yrs',
                '2-5 yrs',
                '5 years+'
            ],
            message : 'Please select correct options for experince required.'
        }
    },
    salary : {
        type : Number,
        required : [true, 'Please enter an expected salary amount']
    },
    postingDate : {
        type : Date,
        default : Date.now
    },
    lastDate : {
        type : Date,
        default : new Date().setDate(new Date().getDate() + 7)
    },
    //Since we dont want to display the list of applicants to a normal user
    // we can use select : false for this purpose
    appliedApplicants : {
        type : [Object],
        select : false
    }
});

//.pre methods are used as middleware to perform some actions on the data before saving
//we cant use the arrow functions because we want to use this keyword.
//Generate a slug for job before saving it to the database
jobSchema.pre('save', function(next){
    this.slug = slugify(this.title,{lower : true}); 

    //Move on to the next part
    next();
}); 


//Setting up location before saving to database
jobSchema.pre('save', async function(next){
    //Create the location object using the geocoder passing the address as the argument
    const loc = await geoCoder.geocode(this.address);
    
    this.location = {
        type : 'Point',
        coordinates : [loc[0].longitude, loc[0].latitude],
        formattedAddress : loc[0].formattedAddress,
        city : loc[0].city,
        state : loc[0].stateCode,
        zipcode : loc[0].zipcode,
        country : loc[0].countryCode
    }

    //Move on to the next part
    next();
});

module.exports = mongoose.model('Job', jobSchema);