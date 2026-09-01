package com.jdc.youtubeshortsblocker

import android.content.Context

/**
 * Preferencias de bloqueo por app. Por defecto todas activas: al habilitar el
 * servicio de accesibilidad se bloquean tanto Shorts como Reels.
 */
object BlockerPrefs {

    private const val PREFS_NAME = "blocker_prefs"

    fun isEnabled(context: Context, target: BlockTarget): Boolean =
        prefs(context).getBoolean(target.prefKey, true)

    fun setEnabled(context: Context, target: BlockTarget, enabled: Boolean) {
        prefs(context).edit().putBoolean(target.prefKey, enabled).apply()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
