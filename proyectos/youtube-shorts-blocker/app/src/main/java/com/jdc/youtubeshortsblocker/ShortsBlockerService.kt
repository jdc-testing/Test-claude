package com.jdc.youtubeshortsblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ShortsBlockerService : AccessibilityService() {

    companion object {
        var isRunning = false
        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        private val SHORTS_CLASS_PATTERNS = listOf(
            "shorts", "reel", "shortspivot", "reelwatch", "shortslandingfragment"
        )
    }

    private val handler = Handler(Looper.getMainLooper())
    private var pendingCheck: Runnable? = null

    override fun onServiceConnected() {
        isRunning = true
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED
            packageNames = arrayOf(YOUTUBE_PACKAGE)
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 50L
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return

        // Detección 1: nombre de clase contiene "shorts" o "reel"
        val className = event.className?.toString()?.lowercase() ?: ""
        if (SHORTS_CLASS_PATTERNS.any { className.contains(it) }) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        // Detección 2: click en algo etiquetado explícitamente como Shorts
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val clickedText = event.text.joinToString(" ").lowercase()
            val clickedDesc = event.contentDescription?.toString()?.lowercase() ?: ""
            if (clickedText.contains("shorts") || clickedDesc.contains("shorts")) {
                performGlobalAction(GLOBAL_ACTION_BACK)
                return
            }
            // Cualquier click en YouTube puede ser un Short desde el feed:
            // programar un chequeo retrasado para cuando la transición termine
            scheduleDelayedCheck()
        }

        // Detección 3: chequeo inmediato del árbol de UI
        checkShortsUI()
    }

    /**
     * Programa un chequeo 300ms después de un click,
     * para cuando la pantalla de Shorts ya haya cargado.
     */
    private fun scheduleDelayedCheck() {
        pendingCheck?.let { handler.removeCallbacks(it) }
        pendingCheck = Runnable { checkShortsUI() }
        handler.postDelayed(pendingCheck!!, 300)
    }

    private fun checkShortsUI() {
        val root = rootInActiveWindow ?: return
        try {
            if (isShortsTabActive(root)) {
                performGlobalAction(GLOBAL_ACTION_BACK)
            }
        } finally {
            root.recycle()
        }
    }

    private fun isShortsTabActive(root: AccessibilityNodeInfo): Boolean {
        val nodes = root.findAccessibilityNodeInfosByText("Shorts") ?: return false
        for (node in nodes) {
            try {
                if (node.isSelected || node.isChecked || node.isFocused) return true
                var parent: AccessibilityNodeInfo? = node.parent
                var depth = 0
                while (parent != null && depth < 3) {
                    val active = parent.isSelected || parent.isChecked || parent.isFocused
                    val next = parent.parent
                    parent.recycle()
                    parent = next
                    depth++
                    if (active) {
                        parent?.recycle()
                        return true
                    }
                }
                parent?.recycle()
            } finally {
                node.recycle()
            }
        }
        return false
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }
}
