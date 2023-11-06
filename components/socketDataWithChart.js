import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import useWebSocket from 'react-use-websocket';

import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5stock from "@amcharts/amcharts5/stock";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const SocketDataWithChart = ({ instId = "BTC-USD-SWAP", channel = "mark-price-candle1m" }) => {
    const chartRef = useRef(null);
    const chartControlsRef = useRef(null);
    const dataRef = useRef([]); // This ref will hold the accumulated data
    const lastMessageRef = useRef(null);

    // Using a ref to track the amCharts instance
    const valueSeriesRef = useRef(null);
    const sbSeriesRef = useRef(null);

    const [oneTimeStateSetting, setOneTimeStateSetting] = useState(null);
    const [chartCreated, setChartCreated] = useState(false);

    // Basetime of chart
    const baseInterval = {
        timeUnit: "millisecond",
        count: 1
    };

    // WebSocket connection URL
    const socketUrl = 'wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999';
    // business
    // public

    // The hook returns a send function and the last message received
    const { sendMessage, lastMessage } = useWebSocket(socketUrl, {
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
                    channel: channel,
                    instId: instId,
                },
            ],
        };
        sendMessage(JSON.stringify(message));
    }, [instId, sendMessage]);

    // This effect runs whenever lastMessage changes
    useEffect(() => {
        if (lastMessage !== null && chartCreated) {
            const messageData = JSON.parse(lastMessage.data);
            if (messageData?.arg?.channel === channel && messageData?.arg?.instId === instId) {
                if (messageData?.data?.length) {
                    addData(messageData.data);
                }
            }
        }
    }, [lastMessage, instId, chartCreated]); // Dependencies

    // You can use lastMessage for the most recent message
    const parsedMessage = lastMessage ? JSON.parse(lastMessage.data) : null;

    lastMessageRef.current = lastMessage ? JSON.parse(lastMessage.data) : null;

    if (!oneTimeStateSetting && parsedMessage && parsedMessage?.arg?.channel === channel && parsedMessage?.arg?.instId === instId) {
        parsedMessage && parsedMessage?.data && parsedMessage?.data?.length && setOneTimeStateSetting(parsedMessage);
    }

    let root, stockChart, mainPanel, valueAxis, dateAxis, valueSeries, valueLegend, volumeAxisRenderer, volumeValueAxis, volumeSeries, sbSeries, scrollbar, sbDateAxis, sbValueAxis, lastDataItem, lastValue, toolbar;

    useLayoutEffect(() => {
        // Initialize chart
        root = am5.Root.new('chartdiv');
        root.setThemes([am5themes_Animated.new(root)]);

        stockChart = root.container.children.push(
            am5stock.StockChart.new(root, {})
        );

        // Set global number format
        root.numberFormatter.set("numberFormat", "#,###.00");

        // Create a main stock panel (chart)
        mainPanel = stockChart.panels.push(am5stock.StockPanel.new(root, {
            wheelY: "zoomX",
            panX: true,
            panY: true
        }));

        // Create value axis
        valueAxis = mainPanel.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {
                pan: "zoom"
            }),
            extraMin: 0.1, // adds some space for the main series
            tooltip: am5.Tooltip.new(root, {}),
            numberFormat: "#,###.00",
            extraTooltipPrecision: 2
        }));

        dateAxis = mainPanel.xAxes.push(am5xy.GaplessDateAxis.new(root, {
            baseInterval: baseInterval,
            groupData: true,
            renderer: am5xy.AxisRendererX.new(root, {}),
            tooltip: am5.Tooltip.new(root, {})
        }));

        valueSeries = mainPanel.series.push(am5xy.CandlestickSeries.new(root, {
            name: instId,
            clustered: false,
            valueXField: "Date",
            valueYField: "Close",
            highValueYField: "High",
            lowValueYField: "Low",
            openValueYField: "Open",
            calculateAggregates: true,
            xAxis: dateAxis,
            yAxis: valueAxis,
            legendValueText: "open: [bold]{openValueY}[/] high: [bold]{highValueY}[/] low: [bold]{lowValueY}[/] close: [bold]{valueY}[/]",
            legendRangeValueText: ""
        }));

        stockChart.set("stockSeries", valueSeries);

        valueLegend = mainPanel.plotContainer.children.push(am5stock.StockLegend.new(root, {
            stockChart: stockChart
        }));

        volumeAxisRenderer = am5xy.AxisRendererY.new(root, {
            inside: true
        });

        volumeAxisRenderer.labels.template.set("forceHidden", true);
        volumeAxisRenderer.grid.template.set("forceHidden", true);

        volumeValueAxis = mainPanel.yAxes.push(am5xy.ValueAxis.new(root, {
            numberFormat: "#.#a",
            height: am5.percent(20),
            y: am5.percent(100),
            centerY: am5.percent(100),
            renderer: volumeAxisRenderer
        }));

        volumeSeries = mainPanel.series.push(am5xy.ColumnSeries.new(root, {
            name: "Volume",
            clustered: false,
            valueXField: "Date",
            valueYField: "Volume",
            xAxis: dateAxis,
            yAxis: volumeValueAxis,
            legendValueText: "[bold]{valueY.formatNumber('#,###.0a')}[/]"
        }));

        volumeSeries.columns.template.setAll({
            strokeOpacity: 0,
            fillOpacity: 0.5
        });

        volumeSeries.columns.template.adapters.add("fill", function (fill, target) {
            let dataItem = target.dataItem;
            if (dataItem) {
                return stockChart.getVolumeColor(dataItem);
            }
            return fill;
        });

        stockChart.set("volumeSeries", volumeSeries);
        valueLegend.data.setAll([valueSeries, volumeSeries]);

        mainPanel.set("cursor", am5xy.XYCursor.new(root, {
            yAxis: valueAxis,
            xAxis: dateAxis,
            snapToSeries: [valueSeries],
            snapToSeriesBy: "y!"
        }));

        scrollbar = mainPanel.set("scrollbarX", am5xy.XYChartScrollbar.new(root, {
            orientation: "horizontal",
            height: 50
        }));

        stockChart.toolsContainer.children.push(scrollbar);

        sbDateAxis = scrollbar.chart.xAxes.push(am5xy.GaplessDateAxis.new(root, {
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererX.new(root, {})
        }));

        sbValueAxis = scrollbar.chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {})
        }));

        sbSeries = scrollbar.chart.series.push(am5xy.LineSeries.new(root, {
            valueYField: "Close",
            valueXField: "Date",
            xAxis: sbDateAxis,
            yAxis: sbValueAxis
        }));

        sbSeries.fills.template.setAll({
            visible: true,
            fillOpacity: 0.3
        });

        // Stock toolbar
        toolbar = am5stock.StockToolbar.new(root, {
            container: document.getElementById("chartcontrols"),
            stockChart: stockChart,
            controls: [
                am5stock.IndicatorControl.new(root, {
                    stockChart: stockChart,
                    legend: valueLegend
                }),
                am5stock.PeriodSelector.new(root, {
                    stockChart: stockChart,
                    periods: [
                        { timeUnit: "minute", count: 1, name: "1Minute" },
                    ]
                }),
                am5stock.DrawingControl.new(root, {
                    stockChart: stockChart
                }),
                am5stock.ResetControl.new(root, {
                    stockChart: stockChart
                }),
                am5stock.SettingsControl.new(root, {
                    stockChart: stockChart
                })
            ]
        });

        // Load initial data for the first series using the simulated socket datafirst
        chartRef.current = stockChart;

        // Assign the series to refs after creation
        valueSeriesRef.current = valueSeries;
        sbSeriesRef.current = sbSeries;
        chartRef.current = { valueSeries, sbSeries, stockChart, root };

        return () => {
            root.dispose();
        };
    }, [oneTimeStateSetting]);

    useEffect(() => {
        oneTimeStateSetting && oneTimeStateSetting.data && parsedMessage && parsedMessage.data && parsedMessage.data.length && addData(parsedMessage.data);
    }, [parsedMessage, oneTimeStateSetting])

    // Function to add new data from the WebSocket to the chart
    function addData(newDataArray) {
        // Check if the chart and series have been initialized
        if (chartRef.current) {
            // Process and append each new data point
            newDataArray.forEach(newDataItem => {
                const newItem = {
                    Date: parseInt(newDataItem[0]), // Unix timestamp to Date object
                    // Date: Date.now(),
                    Open: parseFloat(newDataItem[1]),
                    High: parseFloat(newDataItem[2]),
                    Low: parseFloat(newDataItem[3]),
                    Close: parseFloat(newDataItem[4]),
                    Volume: parseFloat(newDataItem[5])
                };

                // Push the new data point to the current data set
                dataRef.current.push(newItem);
            });

            // Update the chart with the new, merged data set
            updateChartWithData(dataRef.current);
        }
    }

    // Function to update the chart's series with a new data set
    function updateChartWithData(data) {
        console.log({ data });
        // Assuming chartRef.current is an object containing references to the valueSeries and sbSeries
        const { valueSeries, sbSeries } = chartRef.current;

        // If the series have been defined, set the new data
        if (valueSeries && sbSeries) {
            valueSeries.data.setAll(data);
            sbSeries.data.setAll(data);
        }
    }

    return (
        <>
            <div className='p-4 flex flex-col items-center justify-center gap-3 w-full'>
                <h2 className="text-xl font-bold">{instId}</h2>
                <h3>Channel: {channel}</h3>
                <div className='flex flex-col justify-center items-center gap-2'>
                    {parsedMessage && parsedMessage.data && parsedMessage.data.length && parsedMessage.data[0].map((item, idx, arr) => {
                        return (
                            <p key={idx}>{item}</p>
                        )
                    })}
                </div>
            </div>
            <div className="w-full h-full">
                <div id="chartcontrols" ref={chartControlsRef} style={{ height: "auto", padding: "5px 45px 0 15px" }} />
                <div id="chartdiv" ref={chartRef} style={{ width: "100%", height: "500px" }} />
                <p>Candle Chart</p>
            </div>
        </>
    );
};

export default SocketDataWithChart;
