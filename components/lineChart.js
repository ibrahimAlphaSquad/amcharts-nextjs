import React, { useEffect, useLayoutEffect, useRef } from "react";

import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import useWebSocket from "react-use-websocket";

// WebSocket connection URL
const SOCKET_URL = 'wss://wspap.okx.com:8443/ws/v5/public';

function LineChart({ tickerChannel = "index-tickers", tickerInstId = "BTC-USDT" }) {
    // The hook returns a send function and the last message received
    const { sendMessage, lastMessage } = useWebSocket(SOCKET_URL, {
        onOpen: () => console.log('WebSocket Connected'),
        // Will attempt to reconnect on all close events
        shouldReconnect: (closeEvent) => true,
    });

    // Send the subscription message when the component mounts
    useEffect(() => {
        const message = {
            op: 'subscribe',
            args: [
                {
                    channel: tickerChannel,
                    instId: tickerInstId
                }
            ]
        };
        sendMessage(JSON.stringify(message));
    }, [tickerChannel, sendMessage]);

    // You can use lastMessage for the most recent message
    const parsedMessage = lastMessage ? JSON.parse(lastMessage.data) : null;
    // console.log({ parsedMessage, lastMessage });

    const chartRef = useRef(null);
    const dataRef = useRef([]); // This ref will hold the accumulated data

    // Basetime of chart
    const baseInterval = {
        timeUnit: "millisecond",
        count: 1
    };

    // console.log("Line Chart props", { instId, channel, lastMessage });

    // This effect runs whenever lastMessage changes
    useEffect(() => {
        if (lastMessage !== null) {
            const messageData = JSON.parse(lastMessage.data);
            if (messageData?.arg?.channel === tickerChannel && messageData?.arg?.instId === tickerInstId) {
                if (messageData?.data?.length) {
                    // console.log({ socketData: messageData });
                    addData(messageData.data);
                }
            }
        }
    }, [lastMessage, tickerChannel]); // Dependencies

    let root, lineChart, easing, xAxis, yAxis, series, container, circle0, circle1, cursor, scrollbarX, scrollbarY, sbChart, sbxAxis, sbyAxis, sbSeries;

    useLayoutEffect(() => {
        // const startTime = performance.now(); // Start timing

        // Initialize chart
        root = am5.Root.new('lineChartDiv');
        root.setThemes([
            am5themes_Animated.new(root)
        ]);

        lineChart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true
        }));

        // easing = am5.ease.linear;

        // easing = am5.ease.yoyo;

        // easing = am5.ease.out;

        // easing = am5.ease.inOut;

        easing = am5.ease.bounce;

        // easing = am5.ease.elastic;

        // Create axes
        xAxis = lineChart.xAxes.push(am5xy.CategoryAxis.new(root, {
            maxDeviation: 1,
            // baseInterval: baseInterval,
            // groupData: true,
            // extraMax: 0.1, // this adds some space in front
            // extraMin: -0.1,  // this removes some space form th beginning so that the line would not be cut off
            categoryField: "Date",
            // startLocation: 0.5,
            // endLocation: 0.5,
            // tooltip: am5.Tooltip.new(root, {}),
            crisp: true,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 80, pan: "zoom"
            }),
        }));

        xAxis.data.setAll(dataRef.current);

        yAxis = lineChart.yAxes.push(am5xy.ValueAxis.new(root, {
            maxDeviation: 1,
            // groupData: false,
            // extraMax: 0.1, // this adds some space in front
            // extraMin: -0.1,  // this removes some space form th beginning so that the line would not be cut off
            baseInterval: baseInterval,
            // numberFormat: "#,###.##",
            // extraTooltipPrecision: 2,
            // tooltip: am5.Tooltip.new(root, {}),
            renderer: am5xy.AxisRendererY.new(root, { pan: "zoom" })
            // renderer: am5xy.AxisRendererY.new(root, {})
        }));

        // Add series
        series = lineChart.series.push(am5xy.SmoothedXLineSeries.new(root, {
            name: tickerInstId,
            xAxis: xAxis,
            yAxis: yAxis,
            stacked: true,
            valueYField: "Close",
            categoryXField: "Date",
            tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "Latest Index Price: [bold]{valueY}[/] Time Minute and Second: [bold]{categoryX}[/]"
            })
        }));

        series.fills.template.setAll({
            fillOpacity: 0.5,
            visible: true
        });

        series.appear(1000);

        // Enable the series to be filled
        series.filled = true;

        // Set stroke properties to round the edges
        series.strokes.template.setAll({
            strokeLinecap: "round",
            strokeWidth: 2, // Adjust stroke width as needed
        });

        // Set fill properties
        series.fills.template.setAll({
            visible: true,
            fillOpacity: 0.2, // Adjust fill opacity as needed
        });

        // Round the edges of the line
        series.strokes.template.setAll({
            strokeLinecap: "round"
        });

        // Set the base value for the fill
        series.fills.template.setAll({
            fillOpacity: 0.2, // Set your desired opacity for the fill
            baseValue: yAxis.min // This will make the fill start from the bottom
        });

        // create bullet
        container = lineChart.plotContainer.children.push(am5.Container.new(root, {}));
        circle0 = container.children.push(am5.Circle.new(root, {
            radius: 5,
            fill: am5.color(0xff0000)
        }));
        circle1 = container.children.push(am5.Circle.new(root, {
            radius: 5,
            fill: am5.color(0xff0000)
        }));

        circle1.animate({
            key: "radius",
            to: 20,
            duration: 1000,
            easing: am5.ease.out(am5.ease.cubic),
            loops: Infinity
        });
        circle1.animate({
            key: "opacity",
            to: 0,
            from: 1,
            duration: 1000,
            easing: am5.ease.out(am5.ease.cubic),
            loops: Infinity
        });

        container.children.push(am5.Label.new(root, {
            x: am5.percent(100),
            y: am5.percent(100),
            centerY: am5.percent(100),
            centerX: am5.percent(100),
            text: "Latest Index Price: [bold]{valueY}[/] ",
            populateText: true
        }));

        root.events.on("framestarted", function () {
            if (series.dataItems.length > 0) { // Make sure there are dataItems
                var lastDataItem = series.dataItems[series.dataItems.length - 1];
                if (lastDataItem) { // Check if lastDataItem is not undefined
                    var point = lastDataItem.get("point");
                    if (point) {
                        container.setAll({
                            x: point.x,
                            y: point.y
                        });
                    }
                }
            }
        });

        // Add cursor
        // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
        cursor = lineChart.set("cursor", am5xy.XYCursor.new(root, {
            xAxis: xAxis,
        }));

        cursor.lineY.set("visible", true);
        cursor.lineX.set("visible", true);

        // Add scrollbar
        // Assuming `xAxis` is your existing DateAxis with time already configured
        scrollbarX = lineChart.set("scrollbarX", am5.Scrollbar.new(root, {
            orientation: "horizontal",
            height: 50
        }));

        // Now link this scrollbar to your existing DateAxis
        scrollbarX.set("content", xAxis);

        scrollbarY = lineChart.set("scrollbarY", am5.Scrollbar.new(root, {
            orientation: "vertical",
            width: 50,
        }));

        lineChart.appear(1000, 100);

        // // Check Performance
        // root.events.on("framestarted", function () {
        //     const endTime = performance.now();
        //     console.log("Line Chart Load Time: ", endTime - startTime);

        //     // Optionally, remove this event listener after the first invocation
        //     root.events.off("framestarted");
        // });

        chartRef.current = { root, lineChart, easing, xAxis, yAxis, series, container, circle0, circle1, cursor, scrollbarX, scrollbarY, sbChart, sbxAxis, sbyAxis, sbSeries };

        return () => {
            root.dispose();
        };
    }, []);

    function addData(newDataArray) {
        // console.log({ newDataArray });

        // Assuming that newDataArray is an array of arrays with socket data
        newDataArray.forEach(newDataItem => {
            const newChartDataPoint = {
                Date: unixToMinSec(parseInt(newDataItem.ts)), // Unix timestamp to Date object
                // Date: new Date(parseInt(newDataItem.ts)).getUTCSeconds(),
                // Date: parseInt(newDataItem.ts),
                // Open: parseFloat(newDataItem[1]),
                // High: parseFloat(newDataItem[2]),
                // Low: parseFloat(newDataItem[3]),
                Close: parseFloat(newDataItem.idxPx),
                // Volume: parseFloat(newDataItem[5]),
            };

            // Add the new data point to the dataRef
            dataRef.current.push(newChartDataPoint);

            // If we've reached the maximum data length, remove the first item
            if (dataRef.current.length > 2000) {
                dataRef.current.shift();
            }
        });

        // Get a reference to the series
        const { root, series, xAxis, yAxis } = chartRef.current;

        yAxis.axisRanges.clear(); // Remove previous axisRanges to avoid overlaps

        let latestValue = newDataArray[newDataArray.length - 1].idxPx; // Assuming idxPx is the latest Y value

        let axisRange = yAxis.createAxisRange(yAxis.makeDataItem({ value: latestValue }));
        axisRange.get("label").setAll({
            text: latestValue.toString(),
            inside: true,
            // rotation: 0, // Optional: rotate the label to make it vertical
            fill: am5.color(0xffffff), // Color of the text
            background: am5.Rectangle.new(root, {
                fill: am5.color(0x0000ff), // Set the background color to blue
                // fillOpacity: 1, // Adjust the background opacity as needed
                // cornerRadius: 20, // Optional: if you want rounded corners
            }),
        });

        // Set the new data on the series
        series.data.setAll(dataRef.current);
        xAxis.data.setAll(dataRef.current);
    }

    function unixToMinSec(unixTimestamp) {
        var date = new Date(unixTimestamp); // Convert to milliseconds
        var minutes = date.getUTCMinutes();
        var seconds = date.getUTCSeconds();
        return `${minutes}:${seconds}`;
    }

    return (
        <div className='p-4 flex flex-col items-center justify-center gap-3 w-full border-t-2 border-gray-900'>
            <h1 className="py-2 text-center font-bold text-2xl text-gray-900">Line Chart</h1>
            <div className='flex flex-col items-center justify-center gap-3 w-full'>
                <h2 className="text-xl font-bold">{tickerInstId}</h2>
                <h3>Channel: {tickerChannel}</h3>
                <div className='flex flex-col justify-center items-center gap-2'>
                    {parsedMessage && parsedMessage.data && parsedMessage.data.length && parsedMessage.data.map((item, idx) => {
                        return (
                            <div key={idx}>
                                <p>Highest price in the past 24 hours: {item.high24h}</p>
                                <p>Latest Index Price: {item.idxPx}</p>
                                <p>Index with: {item.instId}</p>
                                <p>Lowest price in the past 24 hours: {item.low24h}</p>
                                <p>Open price in the past 24 hours: {item.open24h}</p>
                                <p>Open price in the UTC 0: {item.sodUtc0}</p>
                                <p>Open price in the UTC 8: {item.sodUtc8}</p>
                                <p>Update time of the index ticker, Unix timestamp format in milliseconds: {item.ts}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div id="lineChartDiv" ref={chartRef} style={{ width: "100%", height: "500px" }} />
        </div>
    )
}

export default LineChart