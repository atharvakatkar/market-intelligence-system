import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { Asset } from '../App';
import Aurora from './Aurora';
import BorderGlow from './BorderGlow';

interface DashboardProps {
    assets: Asset[];
    lastUpdated: string;
    onSelectAsset: (asset: string) => void;
    onSelectAudInr: () => void;
    audInrRate: number | null;
    audInrVolatility: any;
    onRefresh: () => void;
    audRate: number | null;
    lastPipelineRun: any;
}

const ASSET_LABELS: Record<string, string> = {
    gold: 'Gold',
    silver: 'Silver',
    oil: 'Crude Oil',
    asx200: 'ASX 200'
};

const ASSET_SYMBOLS: Record<string, string> = {
    gold: 'XAU/USD',
    silver: 'XAG/USD',
    oil: 'WTI',
    asx200: 'ASX:XJO'
};

const COLOR_CLASSES: Record<string, string> = {
    green: 'border-green-500 bg-green-500',
    yellow: 'border-yellow-500 bg-yellow-500',
    orange: 'border-orange-500 bg-orange-500',
    red: 'border-red-500 bg-red-500'
};

const LEVEL_TEXT: Record<string, string> = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    red: 'text-red-400'
};

export default function Dashboard({ assets, lastUpdated, onSelectAsset, onSelectAudInr, onRefresh, audRate, audInrRate, audInrVolatility, lastPipelineRun }: DashboardProps) {
    const [clockDisplay, setClockDisplay] = useState<string>('');
    const [clockDay, setClockDay] = useState<string>('');
    const [publicHoliday, setPublicHoliday] = useState<string | null>(null);

    // Live clock — ticks every second
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const display = now.toLocaleDateString('en-AU', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ', ' + now.toLocaleTimeString('en-AU', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            const day = now.toLocaleDateString('en-AU', { weekday: 'long' });
            setClockDisplay(display);
            setClockDay(day);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Public holiday fetch — once on mount
    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AU`)
            .then(res => res.json())
            .then((holidays: any[]) => {
                const todayStr = today.toISOString().split('T')[0];
                const match = holidays.find(h => h.date === todayStr);
                setPublicHoliday(match ? match.localName : null);
            })
            .catch(() => setPublicHoliday(null));
    }, []);

    const getMomentumIcon = (score: number) => {
        if (score > 0.55) return <TrendingDown className="w-4 h-4 text-red-400" />;
        if (score < 0.45) return <TrendingUp className="w-4 h-4 text-green-400" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getVolatilityInterpretation = (sentiment: number, momentum: number, trend: number): string => {
        const sentimentLabel =
            sentiment < 0.25 ? "low negativity" :
            sentiment < 0.45 ? "moderate negative sentiment" :
            "elevated negative sentiment";

        const momentumLabel =
            momentum < 0.35 ? "downward price momentum" :
            momentum < 0.55 ? "neutral price momentum" :
            "upward price momentum";

        const trendLabel =
            trend < 0.35 ? "sentiment stabilising" :
            trend < 0.55 ? "flat sentiment trend" :
            "rising negative sentiment trend";

        return `${sentimentLabel} · ${momentumLabel} · ${trendLabel}`;
    };

    const overallRisk = assets.length > 0
        ? assets.reduce((sum, a) => sum + a.volatility_score, 0) / assets.length
        : 0;

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                <Aurora
                    colorStops={["#EF4444", "#B497CF", "#5227FF"]}
                    blend={1}
                    amplitude={1.0}
                    speed={1.3}
                />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 py-6" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                {/* Left — title */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Market Intelligence</h1>
                    <p className="text-gray-400 mt-1">Multi-agent sentiment and volatility analysis</p>
                </div>

                {/* Centre — live clock */}
                <div className="text-center">
                    <p className="text-lg font-mono font-semibold text-white">{clockDisplay}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {clockDay}{publicHoliday ? `, ${publicHoliday}` : ''}
                    </p>
                </div>

                {/* Right — refresh controls */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Dashboard refreshed</p>
                        <p className="text-xs text-gray-400">{lastUpdated}</p>
                        {lastPipelineRun?.minutes_ago !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Pipeline: {lastPipelineRun?.minutes_ago < 60
                                    ? `${lastPipelineRun?.minutes_ago}m ago`
                                    : `${Math.floor(lastPipelineRun?.minutes_ago / 60)}h ago`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Overall Risk Banner */}
            <div className="bg-gray-900 rounded-xl p-5 mb-8 border border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <span className="text-gray-300 font-medium">Overall Market Risk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-48 bg-gray-800 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                style={{ width: `${overallRisk * 100}%` }}
                            />
                        </div>
                        <span className="text-white font-bold">{(overallRisk * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Asset Cards — 3+2 Grid */}
            <div className="mb-8">
                {/* Row 1 — Gold, Silver, Oil */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {['gold', 'silver', 'oil'].map(assetKey => {
                        const asset = assets.find(a => a.asset === assetKey);
                        if (!asset) return null;
                        return (
                            <BorderGlow
                                key={asset.asset}
                                backgroundColor="#111827"
                                borderRadius={12}
                                glowColor="40 80 80"
                                colors={['#c084fc', '#f472b6', '#38bdf8']}
                                glowIntensity={1}
                                coneSpread={25}
                            >
                                <div
                                    onClick={() => onSelectAsset(asset.asset)}
                                    className={`bg-gray-900 rounded-xl p-5 border-l-4 ${COLOR_CLASSES[asset.color]?.split(' ')[0]} cursor-pointer hover:bg-gray-800 transition-all`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{ASSET_LABELS[asset.asset]}</h3>
                                            <p className="text-xs text-gray-500">{ASSET_SYMBOLS[asset.asset]}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-right">
                                                <p className="text-base font-bold text-white">
                                                    AU${audRate ? (asset.latest_price * audRate).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    US${asset.latest_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                {getMomentumIcon(asset.momentum_score)}
                                                <span className="text-xs text-gray-400">momentum</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Volatility Risk</p>
                                            <div className="w-32 bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${COLOR_CLASSES[asset.color]?.split(' ')[1]}`}
                                                    style={{ width: `${asset.volatility_score * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${LEVEL_TEXT[asset.color]}`}>
                                            {asset.volatility_level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5 italic">
                                        {getVolatilityInterpretation(asset.sentiment_score, asset.momentum_score, asset.trend_score)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-2">
                                        Updated: {new Date(asset.analysed_at).toLocaleString('en-AU', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </BorderGlow>
                        );
                    })}
                </div>

                {/* Row 2 — ASX200, AUD/INR centered */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-start-1">
                        {assets.find(a => a.asset === 'asx200') && (() => {
                            const asset = assets.find(a => a.asset === 'asx200')!;
                            return (
                                <BorderGlow
                                    backgroundColor="#111827"
                                    borderRadius={12}
                                    glowColor="40 80 80"
                                    colors={['#c084fc', '#f472b6', '#38bdf8']}
                                    glowIntensity={1}
                                    coneSpread={25}
                                >
                                    <div
                                        onClick={() => onSelectAsset(asset.asset)}
                                        className={`bg-gray-900 rounded-xl p-5 border-l-4 ${COLOR_CLASSES[asset.color]?.split(' ')[0]} cursor-pointer hover:bg-gray-800 transition-all`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{ASSET_LABELS[asset.asset]}</h3>
                                                <p className="text-xs text-gray-500">{ASSET_SYMBOLS[asset.asset]}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-white">
                                                    {asset.latest_price?.toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts
                                                </p>
                                                <div className="flex items-center gap-1 justify-end mt-1">
                                                    {getMomentumIcon(asset.momentum_score)}
                                                    <span className="text-xs text-gray-400">momentum</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Volatility Risk</p>
                                                <div className="w-32 bg-gray-800 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${COLOR_CLASSES[asset.color]?.split(' ')[1]}`}
                                                        style={{ width: `${asset.volatility_score * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${LEVEL_TEXT[asset.color]}`}>
                                                {asset.volatility_level}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1.5 italic">
                                            {getVolatilityInterpretation(asset.sentiment_score, asset.momentum_score, asset.trend_score)}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-2">
                                            Updated: {new Date(asset.analysed_at).toLocaleString('en-AU', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </BorderGlow>
                            );
                        })()}
                    </div>

                    <div className="col-start-2">
                        <BorderGlow
                            backgroundColor="#111827"
                            borderRadius={12}
                            glowColor="40 80 80"
                            colors={['#c084fc', '#f472b6', '#38bdf8']}
                            glowIntensity={1}
                            coneSpread={25}
                            className="h-full"
                        >
                            <div
                                onClick={onSelectAudInr}
                                className={`bg-gray-900 rounded-xl p-5 border-l-4 h-full ${audInrVolatility ? COLOR_CLASSES[audInrVolatility.color]?.split(' ')[0] : 'border-blue-500'} cursor-pointer hover:bg-gray-800 transition-all`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">AUD / INR</h3>
                                        <p className="text-xs text-gray-500">Australian Dollar to Indian Rupee</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-bold text-white">
                                            ₹{audInrRate ? audInrRate.toFixed(2) : '—'}
                                        </p>
                                        <p className="text-sm text-gray-400">per 1 AUD</p>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            {audInrVolatility && getMomentumIcon(audInrVolatility.momentum_score)}
                                            <span className="text-xs text-gray-400">momentum</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Volatility Risk</p>
                                        <div className="w-32 bg-gray-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${audInrVolatility ? COLOR_CLASSES[audInrVolatility.color]?.split(' ')[1] : 'bg-blue-500'}`}
                                                style={{ width: `${audInrVolatility ? audInrVolatility.volatility_score * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${audInrVolatility ? LEVEL_TEXT[audInrVolatility.color] : 'text-gray-400'}`}>
                                        {audInrVolatility?.volatility_level || '—'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5 italic">
                                    {audInrVolatility ? getVolatilityInterpretation(audInrVolatility.sentiment_score, audInrVolatility.momentum_score, audInrVolatility.trend_score) : '—'}
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                    {audInrVolatility?.calculated_at ? `Updated: ${new Date(audInrVolatility.calculated_at).toLocaleString('en-AU', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}` : ''}
                                </p>
                            </div>
                        </BorderGlow>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}