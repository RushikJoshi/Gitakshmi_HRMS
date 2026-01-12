exports.calculateNetPreview = async () => {

    try {

        const selectedEmployees = req.body;

        console.log(selectedEmployees);

        res.send("Calcuted Successfully");
    }
    catch(error){
        console.log("Error Occured at the calculating net total of the employee",error);
    }
}