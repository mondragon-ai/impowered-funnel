export const getToday = async () => {
    let TODAY: Date | string = new Date();  
    TODAY = TODAY.toString().substring(0,15);

    return Math.floor((new Date(TODAY).getTime()) / 1000);
}
