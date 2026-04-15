const ARG = (typeof $argument === "object" && $argument !== null) ? $argument : {};
const API_KEY = ARG.ApiKey || $persistentStore.read("天行key") || "";
const PROVINCE = ARG.Province || "陕西";


if (!API_KEY) {
    $notification.post(
        "⛽ 油价查询",
        "未配置 API Key",
        "请在 Loon → 插件 → 油价查询 → 参数设置里填入天行 API Key"
    );
    $done();
} else {
    queryOilPrice();
}


function queryOilPrice() {
    const url = `https://apis.tianapi.com/oilprice/index?key=${API_KEY}&prov=${encodeURIComponent(PROVINCE)}`;
    console.log(url);
    $httpClient.get({ url, timeout: 10 }, (error, response, data) => {
        if (error) {
        	console.log("error:" + error);
            $notification.post("⛽ 油价查询失败", "网络错误", String(error));
            $done();
            return;
        }

        let body;
        try {
            body = JSON.parse(data);
        } catch (e) {
            $notification.post("⛽ 油价查询失败", "响应解析错误", String(data).slice(0, 120));
            $done();
            return;
        }

        if (body.code !== 200 || !body.result) {
            $notification.post("⛽ 油价查询失败", `API 返回 ${body.code}`, body.msg || "未知错误");
            $done();
            return;
        }

        sendNotification(body.result);
        $done();
    });
}


function diffText(result) {
    const storeKey = `oil_price_last_${PROVINCE}`;
    const last = $persistentStore.read(storeKey);
    $persistentStore.write(JSON.stringify(result), storeKey);

    if (!last) return "";
    try {
        const prev = JSON.parse(last);
        const parts = [];
        for (const oil of ["p92", "p95", "p98", "p0"]) {
            const cur = parseFloat(result[oil]);
            const pre = parseFloat(prev[oil]);
            if (!isNaN(cur) && !isNaN(pre)) {
                const d = +(cur - pre).toFixed(2);
                if (d !== 0) {
                    const label = oil === "p0" ? "0#" : oil.slice(1) + "#";
                    parts.push(`${label}${d > 0 ? "↑" : "↓"}${Math.abs(d).toFixed(2)}`);
                }
            }
        }
        return parts.length ? `\n变动：${parts.join("  ")}` : "";
    } catch (e) {
        return "";
    }
}


function sendNotification(r) {
    $notification.post(
        `⛽ ${r.prov} 今日油价`,
        `更新时间：${r.time || ""}`,
        `92# 汽油：¥${r.p92} / 升\n` +
        `95# 汽油：¥${r.p95} / 升\n` +
        `98# 汽油：¥${r.p98} / 升\n` +
        ` 0# 柴油：¥${r.p0} / 升` +
        diffText(r)
    );
}
