<script lang="ts">
    import { draw } from 'svelte/transition';
    import { onMount } from "svelte";
    import { Card } from "./ui";
    // import ApexCharts from 'apexcharts';
    
    export let analytics;

    $: console.log(analytics);

    let chart;
    let chartEl;
    let ApexCharts;

    const data = [
        [new Date('2021-01-01').getTime(), 100],
        [new Date('2021-01-02').getTime(), 400],
        [new Date('2021-01-03').getTime(), 200],
        [new Date('2021-01-04').getTime(), 300],
    ];
    
    onMount(async () => {
        ApexCharts = (await import('apexcharts')).default;
        chart = new ApexCharts(chartEl, {
            series: [{
                name: 'Page views',
                data: data
            }],
            colors: ['#ea580c'],
            fill: {
                colors: ['#ea580c', 'transparent'],
            },
            chart: {
                type: 'area',
                height: 350,
                zoom: {
                    enabled: false
                },
                toolbar: {
                    show: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'straight'
            },
            grid: {
                show: false
            },
            xaxis: {
                type: 'datetime'
            },
            tooltip: {
                theme: 'dark'
            }
        });
        chart.render();
    })
    
</script>


<div class="grid grid-cols-2 gap-4">
    <div class="border rounded-lg p-4">
        <h2>Visitors</h2>
        <span>{analytics.pageVisitors.length}</span>
    </div>
    <div class="border rounded-lg p-4">
        <h2>Page views</h2>
        <div bind:this={chartEl}></div>
        <div class="space-y-2">
            {#each analytics.pageViews as page}
                <div class="border rounded flex justify-between p-2">
                    <span>{page.slug}</span>
                    <span>{page.count}</span>
                </div>
            {/each}
        </div>
    </div>
</div>