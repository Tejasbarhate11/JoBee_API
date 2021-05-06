//This class can be used as a filter for the mongo queries.
//We can use any property to get the results/
class APIFilters {
    //Query can be Job.find() 
    //queryStr stands for the query parameters inside the url
    //It is equal to a json object with the parameters and their required values
    constructor(query, queryStr){
        this.query = query;
        this.queryStr = queryStr;
    }

    //This method is used to return the data which fulfills the required parameters
    // /api/v1/jobs?salary=50000
    // /api/v1/jobs?salary[gt]=50000 (using the gt operator)
    filter() {
        //Create a copy of the queryStr
        const queryStrCopy = {...this.queryStr};

        //Removing different types of filters from the queryStrCopy
        const removeFields = ['sort', 'fields', 'q', 'limit', 'page'];
        removeFields.forEach( el => delete queryStrCopy[el])

        //Advanced filters using the following operators
        //lt : less than
        //lte : less than equal to
        //gt: greater than
        //gte : greater than equal to
        //When we pass the operator through the url the dollar sign is not appended 
        //to the start of the operator like $gt or $lte
        //So we need to do that programatically
        let queryStr = JSON.stringify(queryStrCopy);
        // /\b(gt|gte|lt|lte|in)\b is the regrex pattern used
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`)

        //Convert the string back to a JSON object using JSON.parse()
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }


    //This method is used to sort the data according to the specified parameters in the query
    // /api/v1/jobs?sort=salary (ascending)
    // /api/v1/jobs?sort=-salary (descending)
    // /api/v1/jobs?sort=salary,jobType (multiple parameters)
    sort() {
        //Check is sort is present
        if(this.queryStr.sort){
            //Handling multiple sorting paramters
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        }else{
            //Incase no paramters are specified 
            //Sort based on posting date in descreasing order
            this.query = this.query.sort('-postingDate');
        }

        return this;
    }

    //This method is to limit the fields that we return
    // /api/v1/jobs?fields=title (returns only the title)
    // to exclude certain fields fields=-title.
    limitFields(){
        if(this.queryStr.fields){
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }else{
            //In case no paramters are specified we wil not send the __v parameter 
            this.query = this.query.select('-__v');
        }

        return this;
    }

    //This method is used to return the data that matched the query str with the title parameter
    // /api/v1/jobs?q=node-developer
    searchByQuery() {
        if(this.queryStr.q) {
            const qu = this.queryStr.q.split('-').join(' ');
            this.query = this.query.find({$text: {$search: "\""+ qu +"\""}});
        }

        return this;
    }

    //The data per page and the page number is specified by the user
    // /api/v1/jobs?limit=20&page=5
    pagination() {
        //Convert the data into Int using parseInt(string, base value)
        // || 1 is used in case user does not specify any page value similarly for limit default is 10
        const page = parseInt(this.queryStr.page, 10) || 1;
        const limit = parseInt(this.queryStr.limit, 10) || 10;
        // to get the data on pages rather than page 1
        const skipResults = (page - 1) * limit;

        //skip method is used to skip through the specified number of data
        //limit method is used to limit the no of data returned at a time.
        this.query = this.query.skip(skipResults).limit(limit);

        return this;
    }
}

module.exports = APIFilters;