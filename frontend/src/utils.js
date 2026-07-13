const dateFormat = (dateTime) => {
    let year = dateTime.getFullYear()
    let month = dateTime.getMonth() + 1
    let date = dateTime.getDate()
    if (month < 10) {
        month = `0${month}`
    }
    if (date < 10) {
        date = `0${date}`
    }
    return `${year}${month}${date}`
}

const timeNow = () => {
    // 不到5点都算是今天
    let now = new Date()
    let timeLock = 5
    if (now.getHours() < timeLock) {
        now.setDate(now.getDate() - Math.ceil(timeLock/24))
    }
    return now
}

class TimeUtils {

    static dateFormat(dateTime) {
        return dateFormat(dateTime)
    }

    static today() {
        return dateFormat(timeNow())
    }

    static yesterday() {
        let date = timeNow()
        date.setDate(date.getDate() - 1)
        return dateFormat(date)
    }

    static tomorrow() {
        let date = timeNow()
        date.setDate(date.getDate() + 1)
        return dateFormat(date)
    }

    /**
     * 基于指定日期计算前一天
     * @param {string} dateStr - 日期字符串，格式：YYYYMMDD
     * @returns {string} 前一天的日期字符串
     */
    static getPreviousDay(dateStr) {
        const date = new Date(
            parseInt(dateStr.toString().substring(0, 4)),
            parseInt(dateStr.toString().substring(4, 6)) - 1,
            parseInt(dateStr.toString().substring(6, 8))
        )
        date.setDate(date.getDate() - 1)
        return dateFormat(date)
    }

    /**
     * 基于指定日期计算后一天
     * @param {string} dateStr - 日期字符串，格式：YYYYMMDD
     * @returns {string} 后一天的日期字符串
     */
    static getNextDay(dateStr) {
        const date = new Date(
            parseInt(dateStr.toString().substring(0, 4)),
            parseInt(dateStr.toString().substring(4, 6)) - 1,
            parseInt(dateStr.toString().substring(6, 8))
        )
        date.setDate(date.getDate() + 1)
        return dateFormat(date)
    }

}

export default TimeUtils