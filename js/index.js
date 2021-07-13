window.onload = function () {
    let i = 0;
    let timer1 = null;
    let isRunning = false;
    //isRunning用于判断当前是否正在运行
    function jieDian(id) {
        return document.getElementById(id);
    }
    //id节点调用函数

    function startBtn() {
        timer1 = setInterval(function () {
            i++
            jieDian("second").innerHTML = doubleLing(parseInt(i / 100) % 60);
            jieDian("minute").innerHTML = doubleLing(parseInt(i / 6000) % 60);
        }, 10)
    }
    //开始运行函数

    function pasueBtn() {
        clearInterval(timer1)
    }
    //暂停函数

    jieDian("btn1").onclick = function () {
        if (!isRunning) {
            jieDian("btn1").innerHTML = "PAUSE";
            isRunning = true;
            startBtn();
        } else {
            jieDian("btn1").innerHTML = "START";
            isRunning = false;
            pasueBtn();
        }
    }
    //“开始”与“暂停”点击按钮：
    //当按钮显示为“开始”，点击之后，将按钮转为“暂停”按钮，并触发相应条件；
    //当按钮显示为“暂停”，点击之后，将按钮转为“开始”按钮，并触发相应条件。

    jieDian("reset").onclick = function () {
        clearInterval(timer1)
        i = 0;
        isRunning = false;
        jieDian("btn1").innerHTML = "START";
        jieDian("second").innerHTML = "00";
        jieDian("minute").innerHTML = "00";
    }
    //复位按钮，点击之后将秒表各值复位，并“暂停”秒表

    function doubleLing(i) {
        if (i < 10) {
            return "0" + i
        } else {
            return i
        }
    }
    //赋 0 函数，当时分秒显示为个位数时，在前面加上“0”

}