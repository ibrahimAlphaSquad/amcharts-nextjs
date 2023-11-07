import React, { useEffect, useLayoutEffect, useRef } from "react";

import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

function LineChart({ instId, channel, lastMessage = null }) {
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
            if (messageData?.arg?.channel === channel && messageData?.arg?.instId === instId) {
                if (messageData?.data?.length) {
                    // console.log({ socketData: messageData });
                    addData(messageData.data);
                }
            }
        }
    }, [lastMessage, instId]); // Dependencies

    let root, lineChart, easing, xAxis, yAxis, series, container, circle0, circle1, cursor, scrollbarX, scrollbarY, sbChart, sbxAxis, sbyAxis, sbSeries;

    useLayoutEffect(() => {
        // Initialize chart
        root = am5.Root.new('lineChartiv');
        root.setThemes([am5themes_Animated.new(root)]);

        // Set global number format
        root.numberFormatter.set("numberFormat", "#,###.00");

        lineChart = root.container.children.push(am5xy.XYChart.new(root, {
            focusable: true,
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true
        }));

        easing = am5.ease.linear;

        // Create axes
        xAxis = lineChart.xAxes.push(am5xy.DateAxis.new(root, {
            maxDeviation: 0.5,
            groupData: true,
            extraMax: 0.1, // this adds some space in front
            extraMin: -0.1,  // this removes some space form th beginning so that the line would not be cut off
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 70
            }),
            tooltip: am5.Tooltip.new(root, {}),
        }));

        yAxis = lineChart.yAxes.push(am5xy.ValueAxis.new(root, {
            maxDeviation: 0.5,
            groupData: true,
            extraMax: 0.1, // this adds some space in front
            extraMin: -0.1,  // this removes some space form th beginning so that the line would not be cut off
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 70
            }),
            tooltip: am5.Tooltip.new(root, {}),
            numberFormat: "#,###.00",
            extraTooltipPrecision: 2
        }));

        // Add series
        // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
        series = lineChart.series.push(am5xy.LineSeries.new(root, {
            name: instId,
            xAxis: xAxis,
            yAxis: yAxis,
            highValueYField: "High",
            lowValueYField: "Low",
            openValueYField: "Open",
            valueYField: "Close",
            valueXField: "Date",
            tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "open: [bold]{openValueY}[/] high: [bold]{highValueY}[/] low: [bold]{lowValueY}[/] close: [bold]{valueY}[/]"
            }),
        }));

        series.strokes.template.set("strokeWidth", 2);
        series.fills.template.setAll({
            visible: true,
            fillOpacity: 0.4
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

        cursor.lineY.set("visible", false);

        // Add scrollbar
        // Assuming `xAxis` is your existing DateAxis with time already configured
        scrollbarX = lineChart.set("scrollbarX", am5.Scrollbar.new(root, {
            orientation: "horizontal",
            height:50
        }));

        // Now link this scrollbar to your existing DateAxis
        scrollbarX.set("content", xAxis);

        scrollbarY = lineChart.set("scrollbarY", am5.Scrollbar.new(root, {
            orientation: "vertical",
            width: 50,
        }));

        lineChart.appear(1000, 100);

        chartRef.current = { root, lineChart, easing, xAxis, yAxis, series, container, circle0, circle1, cursor, scrollbarX, scrollbarY, sbChart, sbxAxis, sbyAxis, sbSeries };

        return () => {
            root.dispose();
        };
    }, []);

    function addData(newDataArray) {
        // Assuming that newDataArray is an array of arrays with socket data
        newDataArray.forEach(newDataItem => {
            const newChartDataPoint = {
                Date: parseInt(newDataItem[0]), // Unix timestamp to Date object    
                // Date: Date.now(),
                Open: parseFloat(newDataItem[1]),
                High: parseFloat(newDataItem[2]),
                Low: parseFloat(newDataItem[3]),
                Close: parseFloat(newDataItem[4]),
                Volume: parseFloat(newDataItem[5])
            };

            // Add the new data point to the dataRef
            dataRef.current.push(newChartDataPoint);

            // If we've reached the maximum data length, remove the first item
            if (dataRef.current.length > 2000) {
                dataRef.current.shift();
            }
        });

        // Get a reference to the series
        const { series, sbSeries } = chartRef.current;

        // Set the new data on the series
        series.data.setAll(dataRef.current);

        // Make sure to push the main chart's data to the scrollbar's series as well
        // sbSeries.data.setAll(dataRef.current);
    }

    return (
        <div className='p-4 flex flex-col items-center justify-center gap-3 w-full border-l-2 border-gray-900'>
            <h1 className="py-2 text-center font-bold text-2xl text-gray-900">Line Chart</h1>
            <div id="lineChartiv" ref={chartRef} style={{ width: "100%", height: "500px" }} />
        </div>
    )
}

export default LineChart