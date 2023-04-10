export const getToday = async () => {
    let TODAY: Date | string = new Date();  
    TODAY = TODAY.toLocaleDateString().substring(0,15);
    console.log("[TODAY] TODAYS DATE FEtCHER");
    console.log(TODAY);

    return Math.floor((new Date(TODAY).getTime()) / 1000);
}
