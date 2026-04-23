import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, BarChart2 } from 'lucide-react';
import { Asset } from '../App';

interface DashboardProps {
    assets: Asset[];
    lastUpdated: string;
    onSelectAsset: (asset: string) => void;
    onRefresh: () => void;
    audRate: number | null;
    lagAnalysis: any;
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

const ASSET_DOMAINS: Record<string, string> = {
    gold: 'Precious Metals',
    silver: 'Precious Metals',
    oil: 'Energy',
    asx200: 'Equity Markets'
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

const DOMAINS = ['Precious Metals', 'Energy', 'Equity Markets'];

export default function Dashboard({ assets, lastUpdated, onSelectAsset, onRefresh, audRate, lagAnalysis, lastPipelineRun }: DashboardProps) {
    const getAssetsByDomain = (domain: string) =>
        assets.filter(a => ASSET_DOMAINS[a.asset] === domain);

    const formatPrice = (asset: string, price: number) => {
        if (asset === 'asx200') {
            return `${price.toLocaleString('en-AU', { maximumFractionDigits: 1 })} pts`;
        }
        const audPrice = audRate ? price * audRate : null;
        return audPrice
            ? `AU$${audPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / US$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `US$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Market Intelligence</h1>
                    <p className="text-gray-400 mt-1">Multi-agent sentiment and volatility analysis</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Dashboard refreshed</p>
                        <p className="text-sm text-gray-300">{lastUpdated}</p>
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

            {/* Domains */}
            {DOMAINS.map(domain => {
                const domainAssets = getAssetsByDomain(domain);
                if (domainAssets.length === 0) return null;
                return (
                    <div key={domain} className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-300 mb-4 uppercase tracking-wider text-sm">
                            {domain}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {domainAssets.map(asset => (
                                <div
                                    key={asset.asset}
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
                                                {formatPrice(asset.asset, asset.latest_price)}
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
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            {/* Lag Analysis */}
            <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-gray-300 uppercase tracking-wider text-sm">
                        Sentiment — Price Lag Analysis
                    </h2>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    {lagAnalysis ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(lagAnalysis).map(([asset, data]: [string, any]) => (
                                <div key={asset} className="border border-gray-800 rounded-lg p-4">
                                    <h3 className="text-white font-semibold mb-2">{ASSET_LABELS[asset]}</h3>
                                    {data.status === 'insufficient_data' ? (
                                        <div>
                                            <p className="text-gray-500 text-sm italic">
                                                Insufficient data — need 10+ days of pipeline runs
                                            </p>
                                            <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full bg-blue-500"
                                                    style={{ width: `${Math.min((data.rows / 10) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">{data.rows}/10 days collected</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-gray-300">{data.interpretation}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Best lag: {data.best_lag} — correlation: {data.best_correlation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">Loading lag analysis...</p>
                    )}
                </div>
            </div>
        </div>
    );
}