package com.jdc.youtubeshortsblocker

/**
 * Cada app cuyo feed de vídeo vertical se puede bloquear, junto con las señales
 * que permiten detectarlo desde el servicio de accesibilidad.
 *
 * - [classPatterns]: fragmentos del nombre de clase del evento (en minúsculas).
 * - [viewerIds]: ids de vista que SOLO existen en el visor a pantalla completa.
 *   No incluir ids de la barra de navegación (p.ej. la pestaña en sí), porque
 *   están presentes también en el feed normal y provocarían falsos positivos.
 * - [tabLabels]: texto/descripción de la pestaña; solo bloquea si está seleccionada.
 * - [clickKeywords]: texto/descripción de un elemento pulsado que lleva al feed.
 */
enum class BlockTarget(
    val packageName: String,
    val prefKey: String,
    val classPatterns: List<String>,
    val viewerIds: List<String>,
    val tabLabels: List<String>,
    val clickKeywords: List<String>
) {
    YOUTUBE(
        packageName = "com.google.android.youtube",
        prefKey = "block_youtube_shorts",
        classPatterns = listOf("shorts", "reel", "shortspivot", "reelwatch", "shortslandingfragment"),
        viewerIds = listOf("reel_recycler", "reel_player_page_container", "shorts_container"),
        tabLabels = listOf("shorts"),
        clickKeywords = listOf("shorts")
    ),
    INSTAGRAM(
        packageName = "com.instagram.android",
        prefKey = "block_instagram_reels",
        classPatterns = listOf("clipsviewer", "clipsfragment", "reelviewer", "reelsviewer"),
        viewerIds = listOf(
            "clips_viewer_view_pager",
            "clips_viewer_media_container",
            "clips_swipe_refresh_container"
        ),
        tabLabels = listOf("reels"),
        clickKeywords = listOf("reels")
    );

    companion object {
        fun forPackage(packageName: String?): BlockTarget? =
            values().firstOrNull { it.packageName == packageName }

        val packageNames: Array<String>
            get() = values().map { it.packageName }.toTypedArray()
    }
}
